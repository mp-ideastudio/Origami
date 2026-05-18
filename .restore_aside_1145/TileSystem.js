// New Tile-Based Dungeon System
// Core tile definitions and rendering system

export const TileTypes = {
    EMPTY: 0,
    WALL: 1,
    FLOOR: 2,
    DOOR: 3,
    STAIRS_UP: 4,
    STAIRS_DOWN: 5,
    WATER: 6,
    LAVA: 7,
    PIT: 8,
    GRASS: 9,
    STONE: 10,
    WOOD: 11,
    BRICK: 12,
    CAVE_WALL: 13,
    CAVE_FLOOR: 14,
    DECORATION: 15
};

export const TileThemes = {
    STONE_DUNGEON: {
        name: "Stone Dungeon",
        wallColor: 0x4a4a4a,
        floorColor: 0x2a2a2a,
        wallTexture: "stone_wall",
        floorTexture: "stone_floor"
    },
    BRICK_DUNGEON: {
        name: "Brick Dungeon", 
        wallColor: 0x8b4513,
        floorColor: 0x654321,
        wallTexture: "brick_wall",
        floorTexture: "brick_floor"
    },
    CAVE_SYSTEM: {
        name: "Cave System",
        wallColor: 0x1a1a1a,
        floorColor: 0x0f0f0f,
        wallTexture: "cave_wall",
        floorTexture: "cave_floor"
    },
    WOODEN_STRUCTURES: {
        name: "Wooden Structures",
        wallColor: 0x8b4513,
        floorColor: 0x654321,
        wallTexture: "wood_wall",
        floorTexture: "wood_floor"
    }
};

export class TileSystem {
    constructor(gridSize = 2) {
        this.gridSize = gridSize;
        this.tiles = new Map();
        this.instancedMeshes = new Map();
        this.materials = new Map();
        this.geometries = new Map();
        this.theme = TileThemes.STONE_DUNGEON;
        
        this.initializeMaterials();
        this.initializeGeometries();
    }

    initializeMaterials() {
        // Create materials for each tile type
        const materialDefs = {
            [TileTypes.WALL]: {
                color: this.theme.wallColor,
                roughness: 0.8,
                metalness: 0.1
            },
            [TileTypes.FLOOR]: {
                color: this.theme.floorColor,
                roughness: 0.9,
                metalness: 0.0
            },
            [TileTypes.DOOR]: {
                color: 0x8b4513,
                roughness: 0.7,
                metalness: 0.2
            },
            [TileTypes.WATER]: {
                color: 0x006994,
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.8
            },
            [TileTypes.LAVA]: {
                color: 0xff4500,
                roughness: 0.3,
                metalness: 0.5,
                emissive: 0xff2200,
                emissiveIntensity: 0.5
            },
            [TileTypes.PIT]: {
                color: 0x000000,
                roughness: 1.0,
                metalness: 0.0
            },
            [TileTypes.GRASS]: {
                color: 0x228b22,
                roughness: 1.0,
                metalness: 0.0
            },
            [TileTypes.STONE]: {
                color: 0x808080,
                roughness: 0.8,
                metalness: 0.1
            },
            [TileTypes.WOOD]: {
                color: 0x8b4513,
                roughness: 0.9,
                metalness: 0.0
            },
            [TileTypes.BRICK]: {
                color: 0xb22222,
                roughness: 0.8,
                metalness: 0.1
            },
            [TileTypes.CAVE_WALL]: {
                color: 0x1a1a1a,
                roughness: 0.9,
                metalness: 0.0
            },
            [TileTypes.CAVE_FLOOR]: {
                color: 0x0f0f0f,
                roughness: 0.8,
                metalness: 0.0
            }
        };

        for (const [tileType, props] of Object.entries(materialDefs)) {
            this.materials.set(parseInt(tileType), new THREE.MeshStandardMaterial(props));
        }
    }

    initializeGeometries() {
        // Create geometries for different tile types
        this.geometries.set(TileTypes.WALL, new THREE.BoxGeometry(this.gridSize, this.gridSize * 2, this.gridSize));
        this.geometries.set(TileTypes.FLOOR, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
        this.geometries.set(TileTypes.DOOR, new THREE.BoxGeometry(this.gridSize * 0.8, this.gridSize * 1.8, this.gridSize * 0.2));
        this.geometries.set(TileTypes.WATER, new THREE.BoxGeometry(this.gridSize, 0.05, this.gridSize));
        this.geometries.set(TileTypes.LAVA, new THREE.BoxGeometry(this.gridSize, 0.05, this.gridSize));
        this.geometries.set(TileTypes.PIT, new THREE.BoxGeometry(this.gridSize, this.gridSize * 4, this.gridSize));
        this.geometries.set(TileTypes.GRASS, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
        this.geometries.set(TileTypes.STONE, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
        this.geometries.set(TileTypes.WOOD, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
        this.geometries.set(TileTypes.BRICK, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
        this.geometries.set(TileTypes.CAVE_WALL, new THREE.BoxGeometry(this.gridSize, this.gridSize * 2, this.gridSize));
        this.geometries.set(TileTypes.CAVE_FLOOR, new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
    }

    setTile(x, z, tileType) {
        const key = `${x},${z}`;
        const existingTile = this.tiles.get(key);
        
        if (existingTile && existingTile.type === tileType) {
            return existingTile; // No change needed
        }

        // Remove existing tile if different type
        if (existingTile) {
            this.removeTile(x, z);
        }

        // Create new tile
        const geometry = this.geometries.get(tileType);
        const material = this.materials.get(tileType);
        
        if (!geometry || !material) {
            console.warn(`Invalid tile type: ${tileType}`);
            return null;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x * this.gridSize, 0, z * this.gridSize);
        mesh.userData = {
            tileType,
            x,
            z,
            isTile: true
        };

        // Adjust Y position based on tile type
        switch (tileType) {
            case TileTypes.WALL:
            case TileTypes.CAVE_WALL:
                mesh.position.y = this.gridSize;
                break;
            case TileTypes.FLOOR:
            case TileTypes.GRASS:
            case TileTypes.STONE:
            case TileTypes.WOOD:
            case TileTypes.BRICK:
            case TileTypes.CAVE_FLOOR:
                mesh.position.y = 0;
                break;
            case TileTypes.DOOR:
                mesh.position.y = this.gridSize * 0.9;
                break;
            case TileTypes.WATER:
            case TileTypes.LAVA:
                mesh.position.y = -0.02;
                break;
            case TileTypes.PIT:
                mesh.position.y = -this.gridSize * 2;
                break;
        }

        this.tiles.set(key, {
            type: tileType,
            mesh,
            x,
            z
        });

        return mesh;
    }

    removeTile(x, z) {
        const key = `${x},${z}`;
        const tile = this.tiles.get(key);
        
        if (tile && tile.mesh) {
            if (tile.mesh.parent) {
                tile.mesh.parent.remove(tile.mesh);
            }
            tile.mesh.geometry.dispose();
            if (tile.mesh.material) {
                tile.mesh.material.dispose();
            }
        }
        
        this.tiles.delete(key);
    }

    getTile(x, z) {
        const key = `${x},${z}`;
        return this.tiles.get(key);
    }

    getTileType(x, z) {
        const tile = this.getTile(x, z);
        return tile ? tile.type : TileTypes.EMPTY;
    }

    setTheme(theme) {
        this.theme = theme;
        // Reinitialize materials with new theme
        this.initializeMaterials();
        
        // Update existing tiles
        for (const tile of this.tiles.values()) {
            const newMaterial = this.materials.get(tile.type);
            if (newMaterial) {
                tile.mesh.material = newMaterial;
            }
        }
    }

    clear() {
        for (const tile of this.tiles.values()) {
            if (tile.mesh) {
                if (tile.mesh.parent) {
                    tile.mesh.parent.remove(tile.mesh);
                }
                tile.mesh.geometry.dispose();
                if (tile.mesh.material) {
                    tile.mesh.material.dispose();
                }
            }
        }
        this.tiles.clear();
    }

    addToScene(scene) {
        for (const tile of this.tiles.values()) {
            scene.add(tile.mesh);
        }
    }

    // Check if a position is walkable
    isWalkable(x, z) {
        const tileType = this.getTileType(x, z);
        return tileType === TileTypes.FLOOR || 
               tileType === TileTypes.GRASS || 
               tileType === TileTypes.STONE || 
               tileType === TileTypes.WOOD || 
               tileType === TileTypes.BRICK || 
               tileType === TileTypes.CAVE_FLOOR ||
               tileType === TileTypes.DOOR;
    }

    // Check if a position blocks line of sight
    blocksLOS(x, z) {
        const tileType = this.getTileType(x, z);
        return tileType === TileTypes.WALL || 
               tileType === TileTypes.CAVE_WALL ||
               tileType === TileTypes.DOOR;
    }

    // Get all tiles of a specific type
    getTilesByType(tileType) {
        const result = [];
        for (const tile of this.tiles.values()) {
            if (tile.type === tileType) {
                result.push(tile);
            }
        }
        return result;
    }

    // Get bounding box of all tiles
    getBounds() {
        let minX = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxZ = -Infinity;
        
        for (const tile of this.tiles.values()) {
            minX = Math.min(minX, tile.x);
            minZ = Math.min(minZ, tile.z);
            maxX = Math.max(maxX, tile.x);
            maxZ = Math.max(maxZ, tile.z);
        }
        
        return {
            minX, minZ, maxX, maxZ,
            width: maxX - minX + 1,
            height: maxZ - minZ + 1
        };
    }
}
