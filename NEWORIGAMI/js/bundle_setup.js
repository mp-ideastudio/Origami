import { DungeonMaster } from './DungeonMaster.js';
import { StateManager } from './StateManager.js';
import { RendererSystem } from './RendererSystem.js';
import { WorldBuilder } from './WorldBuilder.js';
import { AccessibilitySystem } from './AccessibilitySystem.js';

console.log("🧩 Initializing Game Bundle...");

// Expose Classes Globally (for legacy/Game.js compatibility)
window.RendererSystem = RendererSystem;
window.StateManager = StateManager;
window.WorldBuilder = WorldBuilder;
window.DungeonMaster = DungeonMaster;
window.AccessibilitySystem = AccessibilitySystem;

// Initialize Core Systems
window.stateManager = new StateManager();

// Renderer System (Creates Scene, Renderer, Cameras)
window.rendererSystem = new RendererSystem();
window.rendererSystem.init();

// Expose Globals for Game.js
window.scene = window.rendererSystem.scene;
window.mainRenderer = window.rendererSystem.renderer;
window.camera = window.rendererSystem.camera; // Map Camera

// World Builder
window.worldBuilder = new WorldBuilder(window.scene, window.stateManager);

// Dungeon Master
window.dungeonMaster = new DungeonMaster(window.stateManager);
window.DungeonMaster = DungeonMaster; // Legacy compat

// Accessibility
window.accessibilitySystem = new AccessibilitySystem(window.stateManager);

// Start Game Loop (DungeonMaster handles the loop logic?)
// Note: original FPV.4.html called initGameLoop().
if (window.dungeonMaster.initGameLoop) {
    window.dungeonMaster.initGameLoop();
}

console.log("✅ Core Systems Initialized & Globals Exposed");
