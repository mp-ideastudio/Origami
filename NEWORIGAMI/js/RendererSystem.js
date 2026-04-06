


/**
 * RendererSystem.js
 * Handles the Three.js scene, cameras, lights, and main render loop (Single-Renderer Scissor Architecture).
 */
export class RendererSystem {
    constructor() {
        this.scene = null;
        this.camera = null; // Map Camera
        this.fpvCamera = null; // FPV Camera
        this.renderer = null;
        this.composer = null;
        
        // Tuning / Config (Copied EXACTLY from FPV.3.html to preserve fidelity)
        this.TILE_SIZE = 5;
        this.TUNING = {
            lighting: {
              playerFill: {
                color: 0xffddaa,
                intensity: 0.4,
                distance: this.TILE_SIZE * 6.5,
                decay: 2.0,
              },
              headlamp: {
                color: 0xfff8e0,
                intensity: 0.5, 
                distance: this.TILE_SIZE * 14, 
                angle: Math.PI / 6.8, 
                penumbra: 0.45, 
                decay: 1.1, 
              },
              monsterFlashlight: {
                color: 0xff6666, 
                intensity: 0.9, 
                distance: this.TILE_SIZE * 8,
                angle: Math.PI / 6.2,
                penumbra: 0.4,
                decay: 1.25,
              },
              monsterOrb: {
                color: 0x4488ff, 
                intensity: 0.25, 
                distance: this.TILE_SIZE * 6,
                decay: 2.2, 
              },
              flashlight: {
                color: 0xffffff, 
                intensity: 0.9, 
                distance: this.TILE_SIZE * 20, 
                angle: Math.PI / 8, 
                penumbra: 0.2, 
                decay: 0.8, 
              },
            },
            map: {
              pitchDeg: 85, 
            },
            models: {
              playerHeight: 1.8, 
              monsterHeight: 1.2, 
            },
        };
        
        // State for render loop
        this.fpvViewContainer = null;
        this.mapCanvasWrapper = null;
        this.mapCameraTarget = new THREE.Vector3();
    }

    init() {
        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.025);

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.setClearColor(0x1a1d24, 1);
        
        // Inject into DOM
        this.renderer.domElement.id = "main-canvas";
        this.renderer.domElement.style.position = "absolute";
        this.renderer.domElement.style.top = "0";
        this.renderer.domElement.style.left = "0";
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";
        this.renderer.domElement.style.zIndex = "0";
        
        const mainContainer = document.getElementById("main-container");
        if (mainContainer) {
            mainContainer.insertBefore(this.renderer.domElement, mainContainer.firstChild);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }

        // 3. Cameras
        this.initCameras();

        // 4. Lighting
        this.initLighting();

        // 5. Global Resize Listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initCameras() {
        // Map Camera Setup
        this.mapCanvasWrapper = document.querySelector("#mapview-container .canvas-wrapper");
        const mapW = this.mapCanvasWrapper ? this.mapCanvasWrapper.clientWidth : 300;
        const mapH = this.mapCanvasWrapper ? this.mapCanvasWrapper.clientHeight : 300;
        
        this.camera = new THREE.PerspectiveCamera(75, mapW / mapH, 0.1, 1000);
        this.camera.layers.enable(4); // MONSTER_ISOLATION_LAYER
        
        // FPV Camera Setup
        this.fpvViewContainer = document.getElementById("fpv-viewport");
        const fpvW = this.fpvViewContainer ? this.fpvViewContainer.clientWidth : window.innerWidth;
        const fpvH = this.fpvViewContainer ? this.fpvViewContainer.clientHeight : window.innerHeight;
        
        this.fpvCamera = new THREE.PerspectiveCamera(75, fpvW / fpvH, 0.1, 100);
        this.fpvCamera.layers.enable(4);
        this.fpvCamera.rotation.set(0,0,0);
        
        // Add to scene
        this.scene.add(this.fpvCamera);
    }

    initLighting() {
        // Cinematic Hemispheres
        const hemi = new THREE.HemisphereLight(0x88aaff, 0x202228, 0.15);
        this.scene.add(hemi);

        // Warm Key Dir Light
        const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.3);
        dirLight.position.set(30, 60, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        const d = 100;
        dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.near = 1; dirLight.shadow.camera.far = 300;
        dirLight.shadow.bias = -0.001;
        dirLight.shadow.normalBias = 0.02;
        this.scene.add(dirLight);

        // Player Flashlight
        this.flashlight = new THREE.SpotLight(0xfffee0, 1.5, 35, Math.PI / 5, 0.3, 1);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.bias = -0.0001;
        this.flashlight.shadow.mapSize.set(1024, 1024);
        
        this.fpvCamera.add(this.flashlight);
        this.fpvCamera.add(this.flashlight.target);

        // FPV Rim Light
        this.rimLight = new THREE.DirectionalLight(0x99bbff, 0.1);
        this.rimLight.position.set(-20, 40, -30);
        this.rimLight.layers.set(1); // FPV_MODEL_LAYER
        this.scene.add(this.rimLight);

        // Map View Specific Lights (Layer 0)
        this.initMapLighting();
    }

    initMapLighting() {
        // Boost Lights for Map Visibility
        const mapAmbientBoost = new THREE.HemisphereLight(0xcce6ff, 0x666666, 0.9);
        mapAmbientBoost.layers.set(0); 
        this.scene.add(mapAmbientBoost);

        const mapDirBoost = new THREE.DirectionalLight(0xfff0d8, 1.2);
        mapDirBoost.position.set(10, 80, 20);
        mapDirBoost.castShadow = true;
        mapDirBoost.shadow.mapSize.set(2048, 2048);
        mapDirBoost.shadow.camera.near = 1; mapDirBoost.shadow.camera.far = 300;
        mapDirBoost.shadow.bias = -0.0005;
        mapDirBoost.shadow.radius = 2;
        mapDirBoost.layers.set(0);
        this.scene.add(mapDirBoost);

        const mapFlatAmbient = new THREE.AmbientLight(0xffffff, 0.35);
        mapFlatAmbient.layers.set(0);
        this.scene.add(mapFlatAmbient);
        
        const mapCoolRim = new THREE.DirectionalLight(0x99bbff, 0.08);
        mapCoolRim.position.set(-20, 40, -30);
        mapCoolRim.layers.set(0);
        this.scene.add(mapCoolRim);
        
        this.mapDramaticSideLight = new THREE.DirectionalLight(0xff9933, 0.4);
        this.mapDramaticSideLight.position.set(-30, 40, 30);
        this.mapDramaticSideLight.castShadow = true;
        this.mapDramaticSideLight.shadow.mapSize.set(1024, 1024);
        this.mapDramaticSideLight.shadow.bias = -0.0008;
        this.mapDramaticSideLight.shadow.radius = 1.5;
        this.mapDramaticSideLight.layers.set(0);
        this.scene.add(this.mapDramaticSideLight);
    }

    onWindowResize() {
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        // Camera aspect updates handled in render loop via viewport logic
    }

    // Main Render Function - Called by Game Loop
    render(deltaTime) {
        if (!this.renderer || !this.scene) return;

        // Cinematic Pulses
        const t = performance.now() * 0.0015;
        if (this.rimLight) {
            this.rimLight.intensity = 0.22 + Math.sin(t) * 0.04;
        }

        // Scissor Test Rendering
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (this.renderer.domElement.width !== width * window.devicePixelRatio || 
            this.renderer.domElement.height !== height * window.devicePixelRatio) {
            this.renderer.setSize(width, height, false);
        }

        this.renderer.setScissorTest(true);
        this.renderer.setClearColor(0x1a1d24, 1);
        this.renderer.clear();

        // 1. Render FPV
        if (this.fpvViewContainer) {
            const rect = this.fpvViewContainer.getBoundingClientRect();
            const bottom = height - rect.bottom;
            this.renderer.setViewport(rect.left, bottom, rect.width, rect.height);
            this.renderer.setScissor(rect.left, bottom, rect.width, rect.height);
            
            this.fpvCamera.aspect = rect.width / rect.height;
            this.fpvCamera.updateProjectionMatrix();
            
            this.renderer.render(this.scene, this.fpvCamera);
        }

        // 2. Render Map
        // Disable fog for map
        const __prevFog = this.scene.fog;
        this.scene.fog = null;

        if (this.mapCanvasWrapper) {
            const rect = this.mapCanvasWrapper.getBoundingClientRect();
            const bottom = height - rect.bottom;
            this.renderer.setViewport(rect.left, bottom, rect.width, rect.height);
            this.renderer.setScissor(rect.left, bottom, rect.width, rect.height);
            
            this.camera.aspect = rect.width / rect.height;
            this.camera.updateProjectionMatrix();

            this.renderer.render(this.scene, this.camera);
        }

        this.renderer.setScissorTest(false);
        this.scene.fog = __prevFog;
    }
}
