
        /**
         * CORE GAME ENGINE (Three.js integration + Application Coordinator)
         */
        const Engine = {
            // State
            player: { x: 5, z: 5, rot: 0 },
            gridSize: 2,
            mapData: [],
            mapWidth: 40,   // Increased for 10 room dungeon
            mapHeight: 40,  // Increased for 10 room dungeon
            headlamp: null,
            outerGlow: null,
            clock: null,
            mixers: [],
            activeTarget: null, // NPC or Monster we are adjacent to
            frameCount: 0,
            lastFpsTime: 0,
            currentFps: 0,

            // Config
            MOVE_SPEED: 1.82, // Reset to baseline requested by user
            ROT_SPEED: 2.2,  // Radians per second
            BOB_AMP: 0.045,  // Vertical bounce height
            SWAY_AMP: 0.015, // Horizontal sway width
            
            keys: { w: false, a: false, s: false, d: false },
            isMoving: false,
            lastGridX: -1,
            lastGridZ: -1,
            wasIdle: true,
            bobTimer: 0,     // Tracks head-bob animation
            bobHeight: 0,    // Current vertical offset
            bobSway: 0,      // Current horizontal offset
            gameTime: 0,     // Custom accumulator for turn-based time-stop effect

            init() {
                this.generateMap();
                this.initWebGL();
                this.initControls();
                this.initComms();
                this.initTuningUI();
                
                this.clock = new THREE.Clock();
                this.mixers = [];
                
                // Initialize layout cache
                this.layoutData = { fpv: null };

                // Expose a direct update method for the Shell to call
                window.updateLayoutData = (data) => {
                    this.layoutData = data;
                };

                // Start Render Loop ONLY after assets are completely loaded to prevent pop-in
                THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                    const percent = (itemsLoaded / itemsTotal) * 100;
                    const fill = document.getElementById('loading-bar-fill');
                    if (fill) fill.style.width = percent + '%';
                    
                    const text = document.getElementById('loading-text');
                    if (text) text.innerText = Math.round(percent) + '%';
                    
                    const file = document.getElementById('loading-file');
                    if (file) {
                        const filename = url.split('/').pop().split('?')[0];
                        file.innerText = `Loading: ${filename}`;
                    }
                };
                
                THREE.DefaultLoadingManager.onLoad = () => {
                    const screen = document.getElementById('loading-screen');
                    if (screen) {
                        screen.style.opacity = '0';
                        setTimeout(() => { if (screen.parentNode) screen.parentNode.removeChild(screen); }, 500);
                    }
                };

                // Start Render Loop
                requestAnimationFrame(() => this.animate());
            },
            
            // Uniformly scale an object so its total height equals targetHeight (in world units)
            // Ported directly from Baseline.Origami..html to fix microscopic 3D model exports
            scaleModelToHeight(object3D, targetHeight) {
                if (!object3D) return 1;
                object3D.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(object3D);
                const currentHeight = Math.max(1e-6, box.max.y - box.min.y);
                const s = targetHeight / currentHeight;
                object3D.scale.multiplyScalar(s);
                object3D.updateMatrixWorld(true);
                return s;
            },

            initTuningUI() {
                const sSpeed = document.getElementById('tune-speed');
                const vSpeed = document.getElementById('val-speed');
                sSpeed.addEventListener('input', (e) => {
                    this.MOVE_SPEED = parseFloat(e.target.value);
                    vSpeed.textContent = this.MOVE_SPEED.toFixed(2);
                });

                const sBob = document.getElementById('tune-bob');
                const vBob = document.getElementById('val-bob');
                sBob.addEventListener('input', (e) => {
                    this.BOB_AMP = parseFloat(e.target.value);
                    vBob.textContent = this.BOB_AMP.toFixed(3);
                });

                const sSway = document.getElementById('tune-sway');
                const vSway = document.getElementById('val-sway');
                sSway.addEventListener('input', (e) => {
                    this.SWAY_AMP = parseFloat(e.target.value);
                    vSway.textContent = this.SWAY_AMP.toFixed(3);
                });
            },

            generateMap() {
                // Initialize rich grid map architecture [x][z]
                this.mapData = Array.from({ length: this.mapWidth }, () => Array.from({ length: this.mapHeight }, () => ({ type: 'wall' })));
                this.rooms = [];
                // STATIC HALLWAY SANDBOX (AS REQUESTED)
                // 1. Single massive 7x7 room at the North end
                const roomSize = 7;
                const rStartX = Math.floor(this.mapWidth / 2) - 3;
                const rStartZ = 5;
                
                this.rooms = [{
                    id: 1, 
                    x: rStartX, 
                    y: rStartZ, 
                    w: roomSize, 
                    h: roomSize, 
                    center: { x: rStartX + 3, y: rStartZ + 3 }
                }];
                
                for(let ry = rStartZ; ry < rStartZ + roomSize; ry++) {
                    for(let rx = rStartX; rx < rStartX + roomSize; rx++) {
                        this.mapData[rx][ry] = { type: 'floor', room: true, roomId: 1 };
                    }
                }
                
                // 2. Straight 7-tile hallway leading South from the room's bottom center
                const hallX = this.rooms[0].center.x;
                const hallStartTopZ = rStartZ + roomSize;
                
                for(let i = 0; i < 7; i++) {
                    this.mapData[hallX][hallStartTopZ + i] = { type: 'floor', hallway: true };
                }
                
                // Entrance exactly at the end of the hallway
                const entrancePos = { x: hallX, y: hallStartTopZ + 6 };
                this.mapData[entrancePos.x][entrancePos.y] = { type: 'entrance' };
                this.mapData[entrancePos.x][entrancePos.y + 1] = { type: 'wall' }; // Blocking wall behind it
                
                // Move Player to entrance, facing North (0 rotation)
                this.player.x = entrancePos.x;
                this.player.z = entrancePos.y;
                this.player.rot = 0;
                
                // Parse entity spawn points
                this.mobSpawns = [];
                const floorTiles = [];
                for(let x=0; x<this.mapWidth; x++) {
                    for(let z=0; z<this.mapHeight; z++) {
                        if(this.mapData[x][z] && this.mapData[x][z].type === 'floor') {
                            floorTiles.push({x, z});
                        }
                    }
                }
                
                // Spawn 1 Target exactly in the center of the sandbox room
                this.mobSpawns.push({ 
                    type: 'goblin', 
                    x: this.rooms[0].center.x, 
                    z: this.rooms[0].center.y, 
                    homeX: this.rooms[0].center.x, 
                    homeZ: this.rooms[0].center.y, 
                    speed: 8.0, 
                    state: 'IDLE', searchTimer: 0 
                });
            },

            carveFuzzyHallway(start, end) {
                let cx = start.x;
                let cy = start.y;
                let lastDir = null;

                while (cx !== end.x || cy !== end.y) {
                    const dx = end.x - cx;
                    const dy = end.y - cy;
                    let moveHorizontal;
                    
                    if (dx === 0) moveHorizontal = false;
                    else if (dy === 0) moveHorizontal = true;
                    else {
                        const continueChance = 0.75;
                        if (lastDir === 'h' && Math.random() < continueChance) moveHorizontal = true;
                        else if (lastDir === 'v' && Math.random() < continueChance) moveHorizontal = false;
                        else moveHorizontal = Math.random() > 0.5;
                    }

                    if (moveHorizontal) {
                        cx += Math.sign(dx); lastDir = 'h';
                    } else {
                        cy += Math.sign(dy); lastDir = 'v';
                    }

                    if (this.mapData[cx]?.[cy]?.type === 'wall') {
                        this.mapData[cx][cy] = { type: 'floor', hallway: true };
                    }
                }
            },

            initWebGL() {
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x0a0a0c);
                // Fog must remain for Shader compilation, but we set it very thin/far
                this.scene.fog = new THREE.FogExp2(0x2a2a2a, 0.005);

                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
                this.camera.position.set(this.player.x * this.gridSize, 1.6, this.player.z * this.gridSize); // Eye level
                this.camera.layers.enable(1); // Ensure FPV camera can see the ceiling (Layer 1)
                this.camera.rotation.y = this.player.rot;

                const canvas = document.getElementById('fpv-canvas');
                this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for perf
                this.renderer.autoClear = false;

                // Setup Layers
                // Layer 0: Default (Walls, Floors, Lights)
                // Layer 1: Ceiling (Hidden from map)
                // Layer 2: Player Body (Hidden from FPV so you don't clip your own face)
                this.camera.layers.enable(1); // FPV sees ceiling
                this.camera.layers.disable(2); // FPV ignores own body

                // PIP Ortho Map Camera
                const aspect = window.innerWidth / window.innerHeight;
                const d = 25; // View frustum size
                this.mapCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
                this.mapCamera.position.set(this.camera.position.x, 50, this.camera.position.z);
                this.mapCamera.lookAt(this.camera.position.x, 0, this.camera.position.z);
                this.mapCamera.layers.enable(0); // Map sees base geometry
                this.mapCamera.layers.enable(2); // Map sees player body
                this.mapCamera.layers.disable(1); // Map ignores ceiling
                
                // --- Baseline Lighting ---
                // Cinematic lighting: cooler sky, warmer key, subtle rim
                const hemisphereLight = new THREE.HemisphereLight(0x88aaff, 0x202228, 0.42);
                this.scene.add(hemisphereLight);
                
                // Warm key directional light for depth and shadows
                const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.665);
                dirLight.position.set(30, 60, 10);
                this.scene.add(dirLight);
                
                // Cool rim light from behind for silhouette separation
                const rimLight = new THREE.DirectionalLight(0x99bbff, 0.245);
                rimLight.position.set(-20, 40, -30);
                this.scene.add(rimLight);
                
                // Player Flashlight
                const headlamp = new THREE.SpotLight(0xfff8e0, 0.5, this.gridSize * 14, Math.PI / 6.8, 0.45, 1.1);
                headlamp.position.set(0, 0, 0);
                headlamp.target.position.set(0, 0, -1);
                
                const outerGlow = new THREE.SpotLight(0xffffff, 0.9, this.gridSize * 20, Math.PI / 8, 0.2, 0.8);
                outerGlow.position.set(0, 0, 0);
                outerGlow.target.position.set(0, 0, -1);
                
                this.camera.add(headlamp);
                this.camera.add(headlamp.target);
                this.camera.add(outerGlow);
                this.camera.add(outerGlow.target);
                
                this.scene.add(this.camera); // Add camera to scene so child components render
                
                // Keep reference for flickering effect in animate()
                this.headlamp = headlamp;
                this.outerGlow = outerGlow;

                window.addEventListener('resize', () => {
                    this.camera.aspect = window.innerWidth / window.innerHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                });

                this.clock = new THREE.Clock();
                this.mixers = [];

                // --- Instantiate Player Avatar ---
                const gltfLoader = new THREE.GLTFLoader();
                const modelUrls = [
                    './assets/models/Player.A.Walking.glb',
                    '../assets/models/Player.A.Walking.glb',
                    'https://raw.githubusercontent.com/mp-ideastudio/origami-models/main/Player.A.Walking.glb'
                ];
                let tryLoadAvatar = (idx) => {
                    if (idx >= modelUrls.length) return;
                    gltfLoader.load(modelUrls[idx], (gltf) => {
                        this.playerModel = gltf.scene;
                        this.scaleModelToHeight(this.playerModel, 1.8);
                        
                        this.playerModel.traverse((child) => {
                            if (child.isMesh) {
                                child.layers.set(2); // Layer 2 is Map-only, invisible to FPV
                                if (child.material) child.material.needsUpdate = true;
                            }
                        });
                        
                        // Setup Idle and Walk clips
                        this.playerMixer = new THREE.AnimationMixer(this.playerModel);
                        const idleClip = gltf.animations.find(c => c.name.toLowerCase().includes('idle'));
                        const walkClip = gltf.animations.find(c => c.name.toLowerCase().includes('walk')) || gltf.animations[0];
                        
                        this.playerActionWalk = this.playerMixer.clipAction(walkClip);
                        this.playerActionIdle = idleClip ? this.playerMixer.clipAction(idleClip) : this.playerActionWalk;
                        
                        this.currentPlayerAction = this.playerActionIdle;
                        this.currentPlayerAction.play();
                        
                        this.mixers.push(this.playerMixer);
                        this.scene.add(this.playerModel);
                    }, undefined, (err) => tryLoadAvatar(idx + 1));
                };
                tryLoadAvatar(0);

                this.buildWorldGeometry();
            },

            // --- Baseline Procedural Textures ---
            makePaperTexture(baseColor) {
                const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
                ctx.fillStyle = baseColor; ctx.fillRect(0,0,256,256);
                for (let i=0;i<400;i++) { 
                    const x=Math.random()*256, y=Math.random()*256, w=Math.random()*24+6; 
                    const a=Math.random()*0.05+0.02; ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(x,y,w,1); 
                }
                ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
                for (let x=0; x<256; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,256); ctx.stroke(); }
                for (let y=0; y<256; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke(); }
                const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8,8); return tex;
            },

            makeWoodTexture(baseColor) {
                const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
                ctx.fillStyle = baseColor; ctx.fillRect(0,0,512,512);
                const plankH = 40;
                for (let y=0;y<512;y+=plankH){
                    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0,y,512,plankH/2);
                    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0,y+plankH/2,512,plankH/2);
                    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0,y+plankH-1,512,1);
                }
                for (let i=0;i<700;i++){
                    const y = Math.random()*512; const len = 40+Math.random()*120; const x = Math.random()*512; const a = Math.random()*0.12;
                    ctx.strokeStyle = `rgba(255,255,255,${a*0.5})`; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(Math.min(512,x+len), y+Math.sin(y*0.05)*2); ctx.stroke();
                    ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(Math.min(512,x+len), y+2+Math.sin((y+2)*0.05)*2); ctx.stroke();
                }
                const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2,2); return tex;
            },

            createDungeonWallTexture() {
                const canvas = document.createElement("canvas");
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#f5f5f5";
                ctx.fillRect(0, 0, 256, 256);
                ctx.fillStyle = "rgba(0,0,0,0.03)";
                for (let i = 0; i < 1000; i++) {
                    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
                }
                ctx.strokeStyle = "#3a2d1e";
                ctx.lineWidth = 24;
                ctx.strokeRect(0, 0, 256, 256);
                ctx.lineWidth = 10;
                for (let i = 48; i < 256; i += 48) {
                    ctx.beginPath();
                    ctx.moveTo(i, 12);
                    ctx.lineTo(i, 244);
                    ctx.stroke();
                }
                for (let i = 64; i < 256; i += 64) {
                    ctx.beginPath();
                    ctx.moveTo(12, i);
                    ctx.lineTo(244, i);
                    ctx.stroke();
                }
                return new THREE.CanvasTexture(canvas);
            },

            createDungeonFloorTexture() {
                const size = 512;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");

                ctx.fillStyle = "#d2b48c"; // Tan stone color
                ctx.fillRect(0, 0, size, size);

                const imageData = ctx.getImageData(0, 0, size, size);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const randomFactor = (Math.random() - 0.5) * 15;
                    data[i]   += randomFactor; 
                    data[i+1] += randomFactor; 
                    data[i+2] += randomFactor;
                }
                ctx.putImageData(imageData, 0, 0);

                ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
                ctx.lineWidth = 2;
                const step = size / 8;
                for(let i = step; i < size; i += step) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
                }

                ctx.strokeStyle = '#8b5a2b';
                ctx.lineWidth = 12;
                const inset = 6;
                ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                return tex;
            },

            createDarkWoodRafterTexture() {
                const size = 512;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");

                ctx.fillStyle = "#2B1810"; // Dark brown wood
                ctx.fillRect(0, 0, size, size);

                const imageData = ctx.getImageData(0, 0, size, size);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const randomFactor = (Math.random() - 0.5) * 20;
                    data[i]   += randomFactor;
                    data[i+1] += randomFactor * 0.8;
                    data[i+2] += randomFactor * 0.6;
                }
                ctx.putImageData(imageData, 0, 0);

                ctx.fillStyle = "#1A0F08"; 
                const beamWidth = 40;
                const beamSpacing = 80;
                for (let y = 0; y < size; y += beamSpacing) {
                    ctx.fillRect(0, y, size, beamWidth);
                }

                ctx.fillStyle = "#1A0F08";
                const vertBeamWidth = 30;
                const vertBeamSpacing = 120;
                for (let x = 0; x < size; x += vertBeamSpacing) {
                    ctx.fillRect(x, 0, vertBeamWidth, size);
                }

                ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
                ctx.lineWidth = 1;
                for (let i = 0; i < 50; i++) {
                    const y = Math.random() * size;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
                }

                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                return tex;
            },

            createStatusCircleTexture(color, blink = false, splitColor = null) {
                const size = 256;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                
                const center = size / 2;
                const radius = (size / 2) - 12;
                
                if (splitColor) {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(center, center, radius, Math.PI/2, Math.PI*1.5); ctx.fill();
                    ctx.fillStyle = splitColor;
                    ctx.beginPath(); ctx.arc(center, center, radius, Math.PI*1.5, Math.PI/2); ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(center, center, radius, 0, Math.PI * 2);
                    ctx.fillStyle = color; // Used to be black interior, but AI needs colored circles
                    ctx.fill();
                }
                
                // White border
                ctx.lineWidth = 12;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
                
                // Arrow pointing forward (Top of canvas corresponds to -Z direction)
                ctx.beginPath();
                ctx.moveTo(center, 25);
                ctx.lineTo(center - 30, 75);
                ctx.lineTo(center + 30, 75);
                ctx.closePath();
                ctx.fillStyle = "#ffffff";
                ctx.fill();

                if (blink && Math.floor(Date.now() / 250) % 2 === 0) {
                    ctx.clearRect(0,0,size,size); // Blink out
                }

                return new THREE.CanvasTexture(canvas);
            },

            buildWorldGeometry() {
                // Initialize geometry container to prevent "children of undefined" crashes on reset
                if (!this.worldGroup) {
                    this.worldGroup = new THREE.Group();
                }

                // Clear old geometry
                while (this.worldGroup.children.length > 0) {
                    this.worldGroup.remove(this.worldGroup.children[0]);
                }

                // Generate premium textures
                const floorTex = this.createDungeonFloorTexture();
                const wallTex = this.createDungeonWallTexture();
                const ceilTex = this.createDarkWoodRafterTexture();
                const objTex = this.makePaperTexture('#444444');

                // Fast Lambert Materials (no expensive GGX BRDF physics on 7 SpotLights)
                const mats = {
                    floor: new THREE.MeshLambertMaterial({ map: floorTex }),
                    ceil: new THREE.MeshLambertMaterial({ map: ceilTex, color: 0xFFFFFF }),
                    wall: new THREE.MeshLambertMaterial({ map: wallTex, color: 0xFFFFFF }),
                    npc: new THREE.MeshLambertMaterial({ color: '#7cfc00', map: objTex }),
                    monster: new THREE.MeshLambertMaterial({ color: '#b85450', map: objTex })
                };

                // Merge geometry for insane performance (instead of 1000s of distinct meshes)
                // NEW: Walls are 1.33 cubes high                // 1. Grid Walls
                const wallHeight = this.gridSize * 1.53;
                const wallGeo = new THREE.BoxGeometry(this.gridSize, wallHeight, this.gridSize);
                
                // 2. InstancedMesh for Insane Performance (1 draw call vs 2000+)
                let wallCount = 0;
                for (let x = 0; x < this.mapWidth; x++) {
                    for (let z = 0; z < this.mapHeight; z++) {
                        if (this.mapData[x]?.[z]?.type === 'wall') wallCount++;
                    }
                }

                const instancedWalls = new THREE.InstancedMesh(wallGeo, mats.wall, wallCount);
                instancedWalls.castShadow = true;
                instancedWalls.receiveShadow = true;
                // Save reference so the raycaster can find it later without filtering the scene graph
                this.walls = [instancedWalls]; 

                const dummy = new THREE.Object3D();
                let wallIdx = 0;

                for (let x = 0; x < this.mapWidth; x++) {
                    for (let z = 0; z < this.mapHeight; z++) {
                        const cell = this.mapData[x]?.[z];
                        if (!cell) continue;

                        if (cell.type === 'wall') {
                            dummy.position.set(x * this.gridSize, wallHeight / 2, z * this.gridSize);
                            dummy.updateMatrix();
                            instancedWalls.setMatrixAt(wallIdx++, dummy.matrix);
                        }
                    }
                }
                
                instancedWalls.instanceMatrix.needsUpdate = true;
                this.worldGroup.add(instancedWalls);
                
                // Ceiling
                ceilTex.repeat.set(this.mapWidth/2, this.mapHeight/2);
                const ceilGeo = new THREE.PlaneGeometry(this.mapWidth * this.gridSize, this.mapHeight * this.gridSize);
                const ceiling = new THREE.Mesh(ceilGeo, mats.ceil);
                ceiling.rotation.x = Math.PI / 2;
                // Match the wall height exactly
                ceiling.position.set((this.mapWidth * this.gridSize)/2 - this.gridSize/2, wallHeight, (this.mapHeight * this.gridSize)/2 - this.gridSize/2);
                ceiling.layers.set(1); // Hide ceiling from the Orthographic map camera (which only renders layer 0)
                this.worldGroup.add(ceiling);

                // Floor
                floorTex.repeat.set(this.mapWidth, this.mapHeight); // Tile floor
                const floorGeo = new THREE.PlaneGeometry(this.mapWidth * this.gridSize, this.mapHeight * this.gridSize);
                const floor = new THREE.Mesh(floorGeo, mats.floor);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set((this.mapWidth * this.gridSize)/2 - this.gridSize/2, 0, (this.mapHeight * this.gridSize)/2 - this.gridSize/2);
                this.worldGroup.add(floor);

                // Dynamic Mob Rendering
                const mobGeo = new THREE.BoxGeometry(1, 2, 1);
                let monCount = 0; let npcCount = 0;
                
                const buildEntity = (sp, isMon, mesh) => {
                    const id = isMon ? `mon_${++monCount}` : `npc_${++npcCount}`;
                    sp.id = id; // Keep track of ID to send to AI worker
                    mesh.userData = { id, type: isMon ? 'enemy' : 'gambler', hp: sp.hp };
                    
                    if (isMon) {
                        // Goblins have bottom origins, place flush with floor
                        mesh.position.set(sp.x * this.gridSize, 0, sp.z * this.gridSize);
                        
                        // Make monsters red initially (IDLE state is red without search cone)
                        const hudTex = this.createStatusCircleTexture('#ff4444');
                        const circleGeo = new THREE.PlaneGeometry(this.gridSize * 0.9, this.gridSize * 0.9);
                        const circleMat = new THREE.MeshBasicMaterial({ 
                            map: hudTex,
                            color: 0xffffff, // White overlay tints the white borders/arrows when changed
                            transparent: true, 
                            opacity: 0.9,
                            depthWrite: false 
                        });
                        const circle = new THREE.Mesh(circleGeo, circleMat);
                        circle.rotation.x = -Math.PI / 2;
                        circle.position.y = 0.02; // Slightly above floor to prevent z-fighting
                        mesh.add(circle);
                        
                        // Add Flashlight Cone (invisible initially)
                        const searchLight = new THREE.SpotLight(0xff0000, 0, this.gridSize * 8, Math.PI / 4, 0.5, 1);
                        searchLight.position.set(0, 1, 0); // Eye level
                        searchLight.target.position.set(0, 1, 1); // Point down +Z (local forward after wrapper rotation)
                        searchLight.name = "searchLight";
                        mesh.add(searchLight);
                        mesh.add(searchLight.target);
                        
                        mesh.userData.baseMat = circleMat; // Save reference for coloring later
                        mesh.userData.searchLight = searchLight;
                        
                        this.testMonster = mesh;
                    } else {
                        // NPC boxes are centered, place at y=1
                        mesh.position.set(sp.x * this.gridSize, 1, sp.z * this.gridSize);
                        this.testNPC = mesh;
                    }

                    this.worldGroup.add(mesh);
                };

                // Load replacement monster model directly from user's remote GitHub repository
                const TARGET_ENEMY_MODEL = './assets/models/YakuzaGoblinGhost.2.glb';
                
                const gltfLoader = new THREE.GLTFLoader();
                gltfLoader.setCrossOrigin?.('anonymous');

                this.mobSpawns.forEach((sp, idx) => {
                    sp.type = 'monster';
                    
                    gltfLoader.load(TARGET_ENEMY_MODEL, (gltf) => {
                        // We use the raw scene directly since each spawn gets its own 'load' call (cached by browser)
                        const goblin = gltf.scene;
                        const entityWrapper = new THREE.Group();
                        entityWrapper.add(goblin);
                        
                        // Initialize Animation Pipeline
                        if (gltf.animations && gltf.animations.length > 0) {
                            const mixer = new THREE.AnimationMixer(goblin);
                            const actions = gltf.animations.map(a => mixer.clipAction(a));
                            
                            // Sequencer: 4=Bow, 2=Laugh, 0=Idle, 3=Look Around 
                            // Sequence: Bow -> Idle -> Look Around -> Laugh -> repeat
                            const seqIndices = [4, 0, 3, 2];
                            let currentSeqStep = 0;
                            
                            const playNextAnim = () => {
                                mixer.stopAllAction();
                                // Bounds safety check in case gltf models differ
                                const idx = seqIndices[currentSeqStep] % actions.length;
                                const act = actions[idx];
                                if (act) {
                                    act.reset();
                                    act.setLoop(THREE.LoopOnce, 1);
                                    act.clampWhenFinished = true;
                                    act.play();
                                }
                                currentSeqStep = (currentSeqStep + 1) % seqIndices.length;
                            };
                            
                            mixer.addEventListener('finished', playNextAnim);
                            playNextAnim(); // Kick off the loop immediately
                            
                            this.mixers.push(mixer);
                            entityWrapper.userData.mixer = mixer;
                            entityWrapper.userData.clips = gltf.animations;
                            entityWrapper.userData.actions = actions;
                        }
                        
                        
                        goblin.traverse((child) => {
                            if (child.isMesh) {
                                const nativeMat = child.material;
                                const matName = nativeMat.name ? nativeMat.name.toLowerCase() : "";
                                const meshName = child.name ? child.name.toLowerCase() : "";
                                
                                const eyeKeywords = ['eye', 'pupil', 'sclera', 'cornea', 'lens', 'iris'];
                                const isEye = eyeKeywords.some(kw => matName.includes(kw) || meshName.includes(kw));
                                
                                // Skip applying hologram transparency and neon color logic to the white eyes
                                if (!isEye) {
                                    // Apply neon cyan/green hologram rules directly to native material to preserve vertex colors and maps
                                    const applyHoloLayer = (mat) => {
                                        mat.transparent = false; // Set to false to remove internal mesh back-face double imagery sorting
                                        mat.opacity = 1.0; 
                                        mat.blending = THREE.NormalBlending;
                                        mat.side = THREE.FrontSide;
                                        mat.depthWrite = true;
                                        
                                        // Some native materials don't have emissive, so we check or fallback
                                        if (mat.emissive !== undefined) {
                                            mat.emissive.set("#00ffcc");
                                            mat.emissiveIntensity = 0.6;
                                        }

                                        // Custom Shader Injection: Isolate bright white texture regions (the eyes) from being tinted by the hologram!
                                        mat.onBeforeCompile = (shader) => {
                                            shader.fragmentShader = shader.fragmentShader.replace(
                                                '#include <emissivemap_fragment>',
                                                [
                                                    '#ifdef USE_EMISSIVEMAP',
                                                    '    vec4 emissiveMapColor = texture2D( emissiveMap, vUv );',
                                                    '    totalEmissiveRadiance *= emissiveMapColor.rgb;',
                                                    '#endif',
                                                    '// Check the brightness of the base texture map',
                                                    'float baseBrightness = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));',
                                                    'if (baseBrightness > 0.65) {', 
                                                    '    totalEmissiveRadiance = vec3(2.0); // Extreme white emissive override',
                                                    '    diffuseColor.rgb = vec3(0.0); // Zero out diffuse so red lights cannot reflect off it',
                                                    '}'
                                                ].join('\n')
                                            );
                                        };
                                    };

                                    if (Array.isArray(nativeMat)) {
                                        nativeMat.forEach(applyHoloLayer);
                                    } else {
                                        applyHoloLayer(nativeMat);
                                    }

                                    child.material = nativeMat;
                                } else {
                                    // Make eyes terrifyingly bright and pure white so Bloom pass triggers heavily
                                    const eyeMat = nativeMat.clone();
                                    if (eyeMat.color) eyeMat.color.setHex(0xffffff);
                                    if (eyeMat.emissive) {
                                        eyeMat.emissive.setHex(0xffffff);
                                        eyeMat.emissiveIntensity = 5.0; // Extreme intensity for Bloom threshold 0.9
                                    }
                                    child.material = eyeMat;
                                }
                                
                                // Fix Z-Index sorting issue against the red targeting circle
                                child.renderOrder = 10; 
                            }
                        });

                        // Attach a strong pure white point light slightly in front and above the monster so it is well-lit
                        const frontLight = new THREE.PointLight(0xffffff, 4.0, this.gridSize * 1.5);
                        frontLight.position.set(0, 2.5, 1.5); // Above and in front (world +Z)
                        goblin.add(frontLight);
                        
                        // Adjust Y position to sit exactly on the floor (circle)
                        goblin.updateMatrixWorld(true);
                        const bbox = new THREE.Box3().setFromObject(goblin);
                        if (bbox.min.y !== 0) {
                            goblin.position.y -= bbox.min.y; 
                        }
                        
                        // Fix Rotation: Force to -Math.PI/2 to swing from 90 degrees Left to 90 degrees Right (facing player)
                        goblin.rotation.y = -Math.PI / 2;

                        buildEntity(sp, true, entityWrapper);
                    }, undefined, (e) => {
                        console.warn(`Failed to load Primary Model for spawn ${idx}, attempting CDN fallback:`, e?.message || e);
                        gltfLoader.load('https://raw.githubusercontent.com/mp-ideastudio/origami-models/main/YakuzaGoblinGhost.2.glb', (fallbackGltf) => {
                            const goblin = fallbackGltf.scene.clone();
                            const entityWrapper = new THREE.Group();
                            entityWrapper.add(goblin);
                            
                            goblin.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
                            
                            goblin.updateMatrixWorld(true);
                            goblin.position.y = 0;
                            goblin.rotation.y = Math.PI / 2;
                            
                            buildEntity(sp, true, entityWrapper);
                        }, undefined, (fallbackErr) => {
                            console.warn("CDN fallback also failed. Using BoxGeometry.");
                            const mesh = new THREE.Mesh(mobGeo, mats.monster);
                            buildEntity(sp, true, mesh);
                        });
                    });
                });

                this.scene.add(this.worldGroup);
            },

            initControls() {
                // Receive keyboard polling state from the Shell
                window.addEventListener('message', (event) => {
                    const data = event.data;
                    if (!data || !data.type) return;

                    if (data.type === 'KEY_DOWN') {
                        const k = data.key.toLowerCase();
                        if (k === 'w' || data.key === 'ArrowUp') this.keys.w = true;
                        if (k === 'a' || data.key === 'ArrowLeft') this.keys.a = true;
                        if (k === 's' || data.key === 'ArrowDown') this.keys.s = true;
                        if (k === 'd' || data.key === 'ArrowRight') this.keys.d = true;
                    } else if (data.type === 'KEY_UP') {
                        const k = data.key.toLowerCase();
                        if (k === 'w' || data.key === 'ArrowUp') this.keys.w = false;
                        if (k === 'a' || data.key === 'ArrowLeft') this.keys.a = false;
                        if (k === 's' || data.key === 'ArrowDown') this.keys.s = false;
                        if (k === 'd' || data.key === 'ArrowRight') this.keys.d = false;
                    }
                });

                // Add local keyboard listeners in case the FPV iframe receives direct focus
                window.addEventListener('keydown', (e) => {
                    const k = e.key.toLowerCase();
                    if (k === 'w' || e.key === 'ArrowUp') this.keys.w = true;
                    if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
                    if (k === 's' || e.key === 'ArrowDown') this.keys.s = true;
                    if (k === 'd' || e.key === 'ArrowRight') this.keys.d = true;
                });
                
                window.addEventListener('keyup', (e) => {
                    const k = e.key.toLowerCase();
                    if (k === 'w' || e.key === 'ArrowUp') this.keys.w = false;
                    if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
                    if (k === 's' || e.key === 'ArrowDown') this.keys.s = false;
                    if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
                });
            },

            checkCollision(gx, gz, radiusInGridUnits) {                
                // Check 4 corners of bounding box around (gx, gz)
                const points = [
                    { x: gx - radiusInGridUnits, z: gz - radiusInGridUnits },
                    { x: gx + radiusInGridUnits, z: gz - radiusInGridUnits },
                    { x: gx - radiusInGridUnits, z: gz + radiusInGridUnits },
                    { x: gx + radiusInGridUnits, z: gz + radiusInGridUnits },
                ];
                for (let p of points) {
                    let cx = Math.round(p.x);
                    let cz = Math.round(p.z);
                    if (!this.isValidGridSpace(cx, cz)) return true;
                }
                return false;
            },

            isValidGridSpace(cx, cz) {
                if(cx < 0 || cx >= this.mapWidth || cz < 0 || cz >= this.mapHeight) return false;
                if(this.mapData[cx]?.[cz]?.type === 'wall') return false;
                
                // Basic entity collision check
                if (this.testNPC) {
                    const eX = Math.round(this.testNPC.position.x / this.gridSize);
                    const eZ = Math.round(this.testNPC.position.z / this.gridSize);
                    if(cx === eX && cz === eZ) return false;
                }
                
                if (this.testMonster) {
                    const mX = Math.round(this.testMonster.position.x / this.gridSize);
                    const mZ = Math.round(this.testMonster.position.z / this.gridSize);
                    if(cx === mX && cz === mZ) return false;
                }
                
                return true;
            },

            checkTriggers() {
                // Check adjacency to NPC or Monster
                let distToNPC = Infinity, distToMon = Infinity;
                
                if (this.testNPC) {
                    distToNPC = Math.abs(Math.round(this.player.x) - Math.round(this.testNPC.position.x/this.gridSize)) + Math.abs(Math.round(this.player.z) - Math.round(this.testNPC.position.z/this.gridSize));
                }
                
                if (this.testMonster) {
                    distToMon = Math.abs(Math.round(this.player.x) - Math.round(this.testMonster.position.x/this.gridSize)) + Math.abs(Math.round(this.player.z) - Math.round(this.testMonster.position.z/this.gridSize));
                }
                
                if (distToNPC === 1) {
                    this.activeTarget = this.testNPC;
                    window.parent.postMessage({ type: 'SHOW_GAMBLING' }, '*');
                } else if (distToMon === 1) {
                    this.activeTarget = this.testMonster;
                    window.parent.postMessage({ type: 'SHOW_COMBAT', health: this.testMonster.userData.hp }, '*');
                } else {
                    this.activeTarget = null;
                    window.parent.postMessage({ type: 'HIDE_ALL' }, '*');
                }
            },

            initComms() {
                // Listen to UI Panels
                window.addEventListener('UI_ACTION', (e) => {
                    const action = e.detail ? e.detail.action : e.data ? e.data.action : null;
                    if (action === 'attack' && this.activeTarget === this.testMonster) {
                        // Forward the attack to the AI Brain (single source of truth)
                        this.postToAI({ type: 'PLAYER_ATTACK', targetId: this.testMonster.userData.id });
                    }
                    if (action === 'retreat') {
                        // Force player backward safely on grid
                        const dx = Math.sin(this.player.rot) * 1.0;
                        const dz = Math.cos(this.player.rot) * 1.0;
                        if (!this.checkCollision(this.player.x + dx, this.player.z + dz, 0.35)) {
                            this.player.x += dx;
                            this.player.z += dz;
                        }
                    }
                });

                // Listen to AI Brain
                window.addEventListener('message', (e) => {
                    if (e.data && e.data.type === 'COMBAT_UPDATE') {
                        // Sync UI with the AI's math
                        document.getElementById('ui-frame').contentWindow.postMessage(
                            { type: 'SHOW_COMBAT', health: e.data.newHp }, 
                            '*'
                        );
                    } else if (e.data && e.data.type === 'AI_DEATH') {
                        // Remove monster if AI declares it dead
                        if (this.testMonster && e.data.id === this.testMonster.userData.id) {
                            this.worldGroup.remove(this.testMonster);
                            this.activeTarget = null;
                            document.getElementById('ui-frame').contentWindow.postMessage({ type: 'HIDE_ALL' }, '*');
                        }
                    } else if (e.data && e.data.type === 'AI_UPDATES') {
                        // Process commands from the A* brain
                        e.data.updates.forEach(up => {
                            const mesh = this.worldGroup.children.find(m => m.userData && m.userData.id === up.id);
                            if (mesh) {
                                if (up.action === 'MOVE') {
                                    // Normally we'd lerp this in the animate loop for smoothness,
                                    // but snapping to grid cells works for this retro grid crawler aesthetic.
                                    mesh.position.x = up.x * this.gridSize;
                                    mesh.position.z = up.z * this.gridSize;
                                }
                                
                                // Color the base circle based on AI State (Red for attacking/chasing, Soft White for idle)
                                if (up.state && mesh.userData.baseMat) {
                                    mesh.userData.baseMat.color.setHex(up.state === 'IDLE' ? 0xffffff : 0xff0000);
                                    mesh.userData.baseMat.opacity = (up.state === 'IDLE' ? 0.2 : 0.4);
                                }
                            }
                        });
                    }
                });

                // Send procedural setup to parent shell (which routes to Map and AI engines)
                window.parent.postMessage({
                    type: 'INIT_ENTITIES',
                    // The Map and AI brain need the dungeon layout
                    mapData: this.mapData, 
                    spawns: this.mobSpawns,
                    playerSpawn: { x: this.player.x, z: this.player.z }
                }, '*');
            },

            postToAI(msg) {
                // Route through the parent shell to avoid cross-origin DOM access errors
                window.parent.postMessage(msg, '*');
            },

            // Main Loop
            animate() {
                // Update delta time for glTF Skeletal Animations
                const delta = this.clock.getDelta();
                this.mixers.forEach(mixer => mixer.update(delta));
                
                let moveDir = 0;
                let turnDir = 0;
                
                if (this.keys.w) moveDir = 1;
                if (this.keys.s) moveDir = -1;
                if (this.keys.a) turnDir = 1;
                if (this.keys.d) turnDir = -1;
                
                // Rotation
                if (turnDir !== 0) {
                    this.player.rot += turnDir * this.ROT_SPEED * delta;
                }
                this.camera.rotation.y = this.player.rot;
                
                // Movement
                let currentlyMoving = false;
                if (moveDir !== 0) {
                    currentlyMoving = true;
                    // Note: moveDir = 1 is forward. In 3D, forward is -z vector.
                    const speed = this.MOVE_SPEED * delta * moveDir;
                    const dx = Math.sin(this.player.rot) * speed;
                    const dz = Math.cos(this.player.rot) * speed;
                    
                    let nextX = this.player.x - dx; 
                    let nextZ = this.player.z - dz;
                    
                    const radius = 0.35; // Collision radius (grid units)
                    
                    let colX = this.checkCollision(nextX, this.player.z, radius);
                    if (colX) nextX = this.player.x;
                    
                    let colZ = this.checkCollision(nextX, nextZ, radius);
                    if (colZ) nextZ = this.player.z;

                    // Auto-Turn UX: seamless corridor cornering
                    if (moveDir === 1 && turnDir === 0 && (colX || colZ)) {
                        // Look one tile to the left and right
                        const checkDist = 1.0; 
                        const leftRot = this.player.rot + Math.PI/2;
                        const rightRot = this.player.rot - Math.PI/2;
                        
                        const leftBlocked = this.checkCollision(this.player.x - Math.sin(leftRot)*checkDist, this.player.z - Math.cos(leftRot)*checkDist, radius);
                        const rightBlocked = this.checkCollision(this.player.x - Math.sin(rightRot)*checkDist, this.player.z - Math.cos(rightRot)*checkDist, radius);
                        
                        if (!leftBlocked && rightBlocked) {
                            this.player.rot += this.ROT_SPEED * delta; 
                        } else if (!rightBlocked && leftBlocked) {
                            this.player.rot -= this.ROT_SPEED * delta; 
                        } else if (!leftBlocked && !rightBlocked) {
                            // T-Junction: Pick a consistent direction (Right-Hand Rule)
                            this.player.rot -= this.ROT_SPEED * delta; 
                        }
                    }
                    
                    this.player.x = nextX;
                    this.player.z = nextZ;
                }
                
                // Grid change detection for AI and Triggers
                const curGridX = Math.round(this.player.x);
                const curGridZ = Math.round(this.player.z);
                if (this.lastGridX !== curGridX || this.lastGridZ !== curGridZ) {
                    this.lastGridX = curGridX;
                    this.lastGridZ = curGridZ;
                    window.parent.postMessage({ type: 'PLAYER_MOVE', x: curGridX, z: curGridZ }, '*');
                    this.checkTriggers();
                }
                
                // State emission for UI styling (e.g. guide panels fading)
                if (currentlyMoving && !this.isMoving) {
                    this.isMoving = true;
                    window.parent.postMessage({ type: 'PLAYER_MOVE_STATE', isMoving: true }, '*');
                    const uiFrame = document.getElementById('ui-frame');
                    if (uiFrame && uiFrame.contentWindow) uiFrame.contentWindow.postMessage({ type: 'PLAYER_MOVE_STATE', isMoving: true }, '*');
                    
                    // Crossfade to walk on 3D Player Avatar
                    if (this.playerActionWalk && this.playerActionIdle) {
                        this.playerActionWalk.reset().play();
                        this.playerActionWalk.crossFadeFrom(this.playerActionIdle, 0.2, true);
                        this.currentPlayerAction = this.playerActionWalk;
                    }
                    
                } else if (!currentlyMoving && this.isMoving) {
                    this.isMoving = false;
                    window.parent.postMessage({ type: 'PLAYER_MOVE_STATE', isMoving: false }, '*');
                    window.parent.postMessage({ type: 'PLAYER_IDLE' }, '*');
                    const uiFrame = document.getElementById('ui-frame');
                    if (uiFrame && uiFrame.contentWindow) {
                        uiFrame.contentWindow.postMessage({ type: 'PLAYER_MOVE_STATE', isMoving: false }, '*');
                        uiFrame.contentWindow.postMessage({ type: 'PLAYER_IDLE' }, '*');
                    }
                    
                    // Crossfade to idle on 3D Player Avatar
                    if (this.playerActionWalk && this.playerActionIdle) {
                        this.playerActionIdle.reset().play();
                        this.playerActionIdle.crossFadeFrom(this.playerActionWalk, 0.2, true);
                        this.currentPlayerAction = this.playerActionIdle;
                    }
                }
                
                // Camera Realism: Head Bobbing & Sway
                // ---------------------------------------------------------------------
                const BOB_FREQ = 12.0;   // How fast the steps are
                
                if (currentlyMoving) {
                    this.bobTimer += delta * BOB_FREQ;
                    // The 'Math.abs(Math.sin)' makes a sharp bounce on each footfall, typical of old-school crawlers
                    this.bobHeight = Math.abs(Math.sin(this.bobTimer)) * this.BOB_AMP;
                    this.bobSway = Math.cos(this.bobTimer / 2) * this.SWAY_AMP; // Half speed sway for weight shift
                } else {
                    // Smoothly ease back to rest position when stopped
                    this.bobTimer = 0;
                    this.bobHeight += (0 - this.bobHeight) * 10 * delta;
                    this.bobSway += (0 - this.bobSway) * 10 * delta;
                }
                
                // Apply final smoothed transforms to the camera
                this.camera.position.x = (this.player.x * this.gridSize) + (Math.cos(this.camera.rotation.y) * this.bobSway);
                this.camera.position.z = (this.player.z * this.gridSize) + (Math.sin(this.camera.rotation.y) * this.bobSway);
                this.camera.position.y = 1.84 + this.bobHeight; // Eye level + bob bounce
                this.camera.rotation.z = this.bobSway * -0.5; // Slight tilt during weight shift
                
                // Sync Player Model positioning
                if (this.playerModel) {
                    this.playerModel.position.set(this.camera.position.x, 0, this.camera.position.z);
                    this.playerModel.rotation.y = this.camera.rotation.y;
                }
                
                // Procedural Breathing & State Machine AI (IDLE, CHASE, SEARCH, RETURN)
                // TIME-STOP / TURN-BASED: Freeze time and logic if player is idle
                if (currentlyMoving) {
                    this.gameTime += delta; 
                }
                const time = this.gameTime * 2.5; // Equivalent scaling to the old Date.now() * 0.0025
                
                if (this.worldGroup && currentlyMoving) {
                    
                    // Raycaster setup for LoS
                    if(!this.raycaster) this.raycaster = new THREE.Raycaster();
                    const pPos = new THREE.Vector3(this.player.x * this.gridSize, 1.0, this.player.z * this.gridSize);
                    
                    // Use the walls array generated during buildWorldGeometry()
                    const walls = this.walls || [];

                    this.worldGroup.children.forEach(child => {
                        if (child.userData && child.userData.type === 'enemy') {
                            const model = child.children[0];
                            const aiData = this.mobSpawns.find(s => s.id === child.userData.id);
                            
                            if (model && !child.userData.mixer) {
                                // Simulate breathing/hovering
                                if (child.userData.bobPhase === undefined) child.userData.bobPhase = Math.random() * Math.PI * 2;
                                model.position.y = Math.abs(Math.sin(time + child.userData.bobPhase)) * 0.12; 
                            }
                            
                            if (!aiData) return;
                            
                            // Line of Sight Check
                            const mPos = child.position.clone();
                            mPos.y = 1.0; // Eye level
                            
                            const dirToPlayer = new THREE.Vector3().subVectors(pPos, mPos);
                            const distToPlayer = dirToPlayer.length();
                            dirToPlayer.normalize();
                            
                            this.raycaster.set(mPos, dirToPlayer);
                            const intersects = this.raycaster.intersectObjects(walls);
                            
                            let hasLoS = true;
                            if (intersects.length > 0 && intersects[0].distance < distToPlayer) {
                                hasLoS = false;
                            }
                            // Hard sight limit
                            if (distToPlayer > this.gridSize * 15) hasLoS = false;

                            // State Machine Transitions
                            if (hasLoS) {
                                aiData.state = 'CHASE';
                                aiData.searchTimer = 0;
                            } else if (aiData.state === 'CHASE') {
                                aiData.state = 'SEARCH';
                                aiData.searchTimer = 0;
                            }
                            
                            // State Execution
                            let viewAngle = 0; // Where is the monster looking?
                            
                            if (aiData.state === 'CHASE') {
                                // Move towards player (TEMPORARILY DISABLED PER USER REQUEST)
                                const angle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                                // The model itself faces +Z locally. We rotate the wrapper container.
                                child.rotation.y = angle; 
                                
                                // User requested monsters only face the player and do not move yet
                                // const dx = Math.sin(angle) * (aiData.speed * 0.75) * delta;
                                // const dz = Math.cos(angle) * (aiData.speed * 0.75) * delta;
                                // child.position.x += dx;
                                // child.position.z += dz;
                                
                                // Update colors
                                if (child.userData.baseMat) {
                                    child.userData.baseMat.map = this.createStatusCircleTexture('#ff0000');
                                }
                                if (child.userData.searchLight) child.userData.searchLight.intensity = 0;
                                
                            } else if (aiData.state === 'SEARCH') {
                                aiData.searchTimer += delta;
                                // Stand still, scan left and right
                                child.rotation.y += Math.sin(time * 2) * delta;
                                
                                if (child.userData.baseMat && Math.floor(time * 4) % 2 === 0) {
                                  // Update texture to blinking split Red/Black, only update 2x a second to save draw calls
                                  child.userData.baseMat.map = this.createStatusCircleTexture('#ff0000', true, '#000000');
                                }
                                
                                if (child.userData.searchLight) child.userData.searchLight.intensity = 2.0;

                                if (aiData.searchTimer > 4.0) { // 4 seconds of searching
                                    aiData.state = 'RETURN';
                                }
                                
                            } else if (aiData.state === 'RETURN') {
                                const hPos = new THREE.Vector3(aiData.homeX * this.gridSize, 1.0, aiData.homeZ * this.gridSize);
                                const dirToHome = new THREE.Vector3().subVectors(hPos, mPos);
                                const distToHome = dirToHome.length();
                                
                                if (distToHome < 0.5) {
                                    aiData.state = 'IDLE';
                                } else {
                                    dirToHome.normalize();
                                    const angle = Math.atan2(dirToHome.x, dirToHome.z);
                                    child.rotation.y = angle;
                                    
                                    const dx = Math.sin(angle) * aiData.speed * delta;
                                    const dz = Math.cos(angle) * aiData.speed * delta;
                                    child.position.x += dx;
                                    child.position.z += dz;
                                }
                                
                                if (child.userData.baseMat) {
                                    child.userData.baseMat.map = this.createStatusCircleTexture('#ffaa00'); // Orange return
                                }
                                if (child.userData.searchLight) child.userData.searchLight.intensity = 0;
                                
                            } else {
                                // IDLE
                                if (child.userData.baseMat) {
                                    child.userData.baseMat.map = this.createStatusCircleTexture('#ff4444');
                                }
                                if (child.userData.searchLight) child.userData.searchLight.intensity = 0;
                            }
                        }
                    });
                }
                
                // ---------------------------------------------------------------------
                // RENDER PASSES
                // ---------------------------------------------------------------------
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                
                // Render FPV Frame
                if (this.layoutData && this.layoutData.fpv) {
                    const fRect = this.layoutData.fpv;
                    this.renderer.setViewport(fRect.left, fRect.bottom, fRect.width, fRect.height);
                    this.renderer.setScissor(fRect.left, fRect.bottom, fRect.width, fRect.height);
                    this.renderer.setScissorTest(true);
                } else {
                    // Fallback to fullscreen if no layout frame yet
                    this.renderer.setViewport(0, 0, winW, winH);
                    this.renderer.setScissor(0, 0, winW, winH);
                    this.renderer.setScissorTest(true);
                }

                // FPV Renderer Call
                this.renderer.setClearColor(0x2a2a2a, 1);
                this.scene.fog.density = 0.12; // Volumetric fog ON
                this.renderer.render(this.scene, this.camera);
                
                // --- PIP Map Renderer Pass (Top Left Corner) ---
                if (this.mapCamera) {
                    const pipSize = 200; // Exact match to .Panels.html map view sizing
                    const pipPaddingLeft = 30; // 30px from left
                    const pipPaddingTop = 30;  // 30px from top
                    
                    const pX = pipPaddingLeft;
                    const pY = winH - pipSize - pipPaddingTop; // Bottom-up Y
                    
                    this.renderer.setViewport(pX, pY, pipSize, pipSize);
                    this.renderer.setScissor(pX, pY, pipSize, pipSize);
                    this.renderer.setScissorTest(true);
                    
                    // Track camera position logic securely above the maze
                    this.mapCamera.position.set(this.camera.position.x, 30, this.camera.position.z);
                    this.mapCamera.lookAt(this.camera.position.x, 0, this.camera.position.z);
                    
                    this.renderer.setClearColor(0x111111, 1); // Dark background for map
                    this.scene.fog.density = 0; // Disable fog for absolute clarity
                    this.renderer.render(this.scene, this.mapCamera);
                }
                
                // --- FPS Counter ---
                this.frameCount++;
                const now = performance.now();
                if (now - this.lastFpsTime >= 1000) {
                    this.currentFps = this.frameCount;
                    this.frameCount = 0;
                    this.lastFpsTime = now;
                    const fpsEl = document.getElementById('fps-counter');
                    if (fpsEl) {
                        fpsEl.textContent = `FPS: ${this.currentFps}/60`;
                    }
                }

                requestAnimationFrame(() => this.animate());
            }
        };

        

    

window.Engine = Engine;
