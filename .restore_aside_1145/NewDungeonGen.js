// New Dungeon Generator
// Uses tile system and room templates for modular dungeon creation

import { TileSystem, TileTypes, TileThemes } from './TileSystem.js';
import { RoomTemplates, RoomCategories, getRandomTemplate } from './RoomTemplates.js';

export class NewDungeonGen {
    constructor(gridSize = 2) {
        this.gridSize = gridSize;
        this.tileSystem = new TileSystem(gridSize);
        this.rooms = [];
        this.corridors = [];
        this.entities = [];
        this.mapWidth = 128;
        this.mapHeight = 128;
        this.theme = TileThemes.STONE_DUNGEON;
        
        // Initialize empty map
        this.mapData = Array.from({ length: this.mapWidth }, () =>
            Array.from({ length: this.mapHeight }, () => ({
                type: TileTypes.EMPTY,
                room: null,
                corridor: null,
                discovered: false
            }))
        );
    }

    generateDungeon(options = {}) {
        const {
            roomCount = 12,
            corridorComplexity = 0.7,
            theme = TileThemes.STONE_DUNGEON,
            includeShop = true,
            includeTreasure = true,
            includeBoss = true
        } = options;

        this.theme = theme;
        this.tileSystem.setTheme(theme);

        // Clear existing data
        this.clearDungeon();

        // Place entrance room
        const entranceRoom = this.placeRoom(RoomTemplates.ENTRANCE_ROOM, 64, 64);
        this.rooms.push(entranceRoom);

        // Generate main dungeon layout
        this.generateMainLayout(roomCount, corridorComplexity);

        // Add special rooms
        if (includeShop) {
            this.addSpecialRoom('SHOP_ROOM');
        }
        if (includeTreasure) {
            this.addSpecialRoom('TREASURE_ROOM');
        }
        if (includeBoss) {
            this.addSpecialRoom('BOSS_ROOM');
        }

        // Connect all rooms with corridors
        this.connectRooms();

        // Place entities (enemies, loot, etc.)
        this.placeEntities();

        // Add decorative elements
        this.addDecorations();

        // Set player spawn position
        this.setPlayerSpawn();

        return {
            tileSystem: this.tileSystem,
            rooms: this.rooms,
            corridors: this.corridors,
            entities: this.entities,
            mapData: this.mapData
        };
    }

    clearDungeon() {
        this.tileSystem.clear();
        this.rooms = [];
        this.corridors = [];
        this.entities = [];
        
        // Reset map data
        for (let x = 0; x < this.mapWidth; x++) {
            for (let z = 0; z < this.mapHeight; z++) {
                this.mapData[x][z] = {
                    type: TileTypes.EMPTY,
                    room: null,
                    corridor: null,
                    discovered: false
                };
            }
        }
    }

    placeRoom(template, startX, startY) {
        const room = {
            template: template,
            x: startX,
            y: startY,
            width: template.width,
            height: template.height,
            entrances: [],
            center: {
                x: startX + Math.floor(template.width / 2),
                y: startY + Math.floor(template.height / 2)
            }
        };

        // Copy template entrances to world coordinates
        room.entrances = template.entrances.map(entrance => ({
            x: startX + entrance.x,
            y: startY + entrance.y,
            direction: entrance.direction
        }));

        // Place tiles
        for (let y = 0; y < template.height; y++) {
            for (let x = 0; x < template.width; x++) {
                const worldX = startX + x;
                const worldY = startY + y;
                
                if (worldX >= 0 && worldX < this.mapWidth && 
                    worldY >= 0 && worldY < this.mapHeight) {
                    
                    const tileType = template.pattern[y][x];
                    this.mapData[worldX][worldY] = {
                        type: tileType,
                        room: room,
                        corridor: null,
                        discovered: false
                    };
                    
                    if (tileType !== TileTypes.EMPTY) {
                        this.tileSystem.setTile(worldX, worldY, tileType);
                    }
                }
            }
        }

        return room;
    }

    generateMainLayout(roomCount, complexity) {
        const lastRoom = this.rooms[this.rooms.length - 1];
        let currentRoom = lastRoom;

        for (let i = 1; i < roomCount; i++) {
            // Select random room template
            let template;
            if (i < roomCount * 0.3) {
                template = getRandomTemplate('SMALL');
            } else if (i < roomCount * 0.7) {
                template = getRandomTemplate('MEDIUM');
            } else {
                template = getRandomTemplate('LARGE');
            }

            // Find valid position for new room
            const position = this.findRoomPosition(currentRoom, template);
            if (position) {
                const newRoom = this.placeRoom(template, position.x, position.y);
                this.rooms.push(newRoom);
                currentRoom = newRoom;
            }
        }
    }

    findRoomPosition(fromRoom, template) {
        const maxAttempts = 50;
        const minDistance = 3; // Minimum distance between rooms
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Choose random entrance from current room
            const entrance = fromRoom.entrances[Math.floor(Math.random() * fromRoom.entrances.length)];
            
            // Calculate potential position based on entrance direction
            let newX, newY;
            const corridorLength = Math.floor(Math.random() * 3) + 3; // 3-5 tiles corridor
            
            switch (entrance.direction) {
                case 'north':
                    newX = entrance.x - Math.floor(template.width / 2);
                    newY = entrance.y - corridorLength - template.height;
                    break;
                case 'south':
                    newX = entrance.x - Math.floor(template.width / 2);
                    newY = entrance.y + corridorLength;
                    break;
                case 'west':
                    newX = entrance.x - corridorLength - template.width;
                    newY = entrance.y - Math.floor(template.height / 2);
                    break;
                case 'east':
                    newX = entrance.x + corridorLength;
                    newY = entrance.y - Math.floor(template.height / 2);
                    break;
            }

            // Check if position is valid
            if (this.isValidRoomPosition(newX, newY, template.width, template.height)) {
                return { x: newX, y: newY };
            }
        }

        return null; // No valid position found
    }

    isValidRoomPosition(x, y, width, height) {
        // Check bounds
        if (x < 1 || y < 1 || x + width >= this.mapWidth - 1 || y + height >= this.mapHeight - 1) {
            return false;
        }

        // Check for overlaps with existing rooms
        for (let checkY = y - 1; checkY < y + height + 1; checkY++) {
            for (let checkX = x - 1; checkX < x + width + 1; checkX++) {
                if (this.mapData[checkX][checkY].type !== TileTypes.EMPTY) {
                    return false;
                }
            }
        }

        return true;
    }

    connectRooms() {
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const room1 = this.rooms[i];
            const room2 = this.rooms[i + 1];
            
            // Find closest entrances
            const connection = this.findBestConnection(room1, room2);
            if (connection) {
                this.createCorridor(connection.entrance1, connection.entrance2);
            }
        }
    }

    findBestConnection(room1, room2) {
        let bestConnection = null;
        let minDistance = Infinity;

        for (const entrance1 of room1.entrances) {
            for (const entrance2 of room2.entrances) {
                const distance = Math.abs(entrance1.x - entrance2.x) + Math.abs(entrance1.y - entrance2.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestConnection = { entrance1, entrance2 };
                }
            }
        }

        return bestConnection;
    }

    createCorridor(start, end) {
        // Simple L-shaped corridor
        const corridor = {
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
            tiles: []
        };

        // Create horizontal segment
        const startX = Math.min(start.x, end.x);
        const endX = Math.max(start.x, end.x);
        for (let x = startX; x <= endX; x++) {
            this.placeCorridorTile(x, start.y);
            corridor.tiles.push({ x, y: start.y });
        }

        // Create vertical segment
        const startY = Math.min(start.y, end.y);
        const endY = Math.max(start.y, end.y);
        for (let y = startY; y <= endY; y++) {
            this.placeCorridorTile(end.x, y);
            corridor.tiles.push({ x: end.x, y });
        }

        this.corridors.push(corridor);
    }

    placeCorridorTile(x, y) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            if (this.mapData[x][y].type === TileTypes.EMPTY) {
                this.mapData[x][y] = {
                    type: TileTypes.FLOOR,
                    room: null,
                    corridor: true,
                    discovered: false
                };
                this.tileSystem.setTile(x, y, TileTypes.FLOOR);
            }
        }
    }

    addSpecialRoom(templateName) {
        const template = RoomTemplates[templateName];
        if (!template) return;

        // Find suitable position (usually far from entrance)
        const position = this.findSpecialRoomPosition(template);
        if (position) {
            const room = this.placeRoom(template, position.x, position.y);
            this.rooms.push(room);
        }
    }

    findSpecialRoomPosition(template) {
        // Try to place special room at the edge of the dungeon
        const bounds = this.getDungeonBounds();
        const margin = 10;

        for (let attempt = 0; attempt < 20; attempt++) {
            const x = bounds.minX + margin + Math.floor(Math.random() * (bounds.width - margin * 2 - template.width));
            const y = bounds.minY + margin + Math.floor(Math.random() * (bounds.height - margin * 2 - template.height));

            if (this.isValidRoomPosition(x, y, template.width, template.height)) {
                return { x, y };
            }
        }

        return null;
    }

    placeEntities() {
        for (const room of this.rooms) {
            if (room.template.special) {
                continue; // Skip special rooms
            }

            // Place enemies in regular rooms
            const enemyCount = Math.floor(Math.random() * 2) + 1; // 1-2 enemies per room
            for (let i = 0; i < enemyCount; i++) {
                const pos = this.getRandomFloorPosition(room);
                if (pos) {
                    this.entities.push({
                        type: 'enemy',
                        x: pos.x,
                        y: pos.y,
                        room: room,
                        template: 'goblin'
                    });
                }
            }

            // Place loot occasionally
            if (Math.random() < 0.3) { // 30% chance for loot
                const pos = this.getRandomFloorPosition(room);
                if (pos) {
                    this.entities.push({
                        type: 'loot',
                        x: pos.x,
                        y: pos.y,
                        room: room,
                        template: 'gold'
                    });
                }
            }
        }
    }

    getRandomFloorPosition(room) {
        const attempts = 20;
        for (let i = 0; i < attempts; i++) {
            const x = room.x + Math.floor(Math.random() * room.width);
            const y = room.y + Math.floor(Math.random() * room.height);

            if (this.mapData[x][y].type === TileTypes.FLOOR) {
                // Check if position is not already occupied
                const occupied = this.entities.some(entity => entity.x === x && entity.y === y);
                if (!occupied) {
                    return { x, y };
                }
            }
        }

        return null;
    }

    addDecorations() {
        // Add decorative elements based on room templates
        for (const room of this.rooms) {
            if (room.template.decorations) {
                for (const decoration of room.template.decorations) {
                    const worldX = room.x + decoration.x;
                    const worldY = room.y + decoration.y;

                    this.entities.push({
                        type: 'decoration',
                        x: worldX,
                        y: worldY,
                        room: room,
                        template: decoration.type
                    });
                }
            }
        }
    }

    setPlayerSpawn() {
        const entranceRoom = this.rooms.find(room => room.template.special === 'entrance');
        if (entranceRoom) {
            this.playerSpawn = {
                x: entranceRoom.center.x,
                y: entranceRoom.center.y
            };
        }
    }

    getDungeonBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const room of this.rooms) {
            minX = Math.min(minX, room.x);
            minY = Math.min(minY, room.y);
            maxX = Math.max(maxX, room.x + room.width);
            maxY = Math.max(maxY, room.y + room.height);
        }

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // Integration methods for existing systems
    getTileType(x, y) {
        return this.tileSystem.getTileType(x, y);
    }

    isWalkable(x, y) {
        return this.tileSystem.isWalkable(x, y);
    }

    blocksLOS(x, y) {
        return this.tileSystem.blocksLOS(x, y);
    }

    addToScene(scene) {
        this.tileSystem.addToScene(scene);
    }

    // Export data for existing systems
    exportForLegacySystem() {
        const legacyMapData = [];
        const legacyMobSpawns = [];

        // Convert new map data to legacy format
        for (let x = 0; x < this.mapWidth; x++) {
            legacyMapData[x] = [];
            for (let y = 0; y < this.mapHeight; y++) {
                const tile = this.mapData[x][y];
                let legacyType = 'wall';
                
                switch (tile.type) {
                    case TileTypes.FLOOR:
                    case TileTypes.GRASS:
                    case TileTypes.STONE:
                    case TileTypes.WOOD:
                    case TileTypes.BRICK:
                    case TileTypes.CAVE_FLOOR:
                        legacyType = 'floor';
                        break;
                    case TileTypes.DOOR:
                        legacyType = 'door';
                        break;
                    case TileTypes.STAIRS_UP:
                        legacyType = 'stairs_up';
                        break;
                    case TileTypes.STAIRS_DOWN:
                        legacyType = 'stairs_down';
                        break;
                    case TileTypes.WATER:
                        legacyType = 'water';
                        break;
                    case TileTypes.LAVA:
                        legacyType = 'lava';
                        break;
                    case TileTypes.PIT:
                        legacyType = 'pit';
                        break;
                }

                legacyMapData[x][y] = {
                    type: legacyType,
                    discovered: tile.discovered,
                    room: tile.room,
                    corridor: tile.corridor
                };
            }
        }

        // Convert entities to legacy mob spawn format
        let enemyId = 0;
        for (const entity of this.entities) {
            if (entity.type === 'enemy') {
                legacyMobSpawns.push({
                    id: `goblin-${enemyId++}-${Date.now()}`,
                    name: "Yakuza Goblin",
                    type: "goblin",
                    x: entity.x,
                    z: entity.y,
                    homeX: entity.x,
                    homeZ: entity.y,
                    speed: 8.0,
                    hp: 50,
                    maxHp: 50,
                    state: "IDLE",
                    searchTimer: 0,
                    isHostile: true
                });
            }
        }

        return {
            mapData: legacyMapData,
            mobSpawns: legacyMobSpawns,
            rooms: this.rooms,
            playerSpawn: this.playerSpawn,
            tileSystem: this.tileSystem
        };
    }
}
