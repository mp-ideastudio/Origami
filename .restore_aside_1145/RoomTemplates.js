// Room Template System
// Pre-designed room patterns for dungeon generation

export const RoomTemplates = {
    // Small Rooms (5x5)
    SMALL_EMPTY: {
        name: "Small Empty Room",
        width: 5,
        height: 5,
        pattern: [
            [1,1,1,1,1],
            [1,2,2,2,1],
            [1,2,2,2,1],
            [1,2,2,2,1],
            [1,1,1,1,1]
        ],
        entrances: [
            { x: 2, y: 0, direction: 'north' },
            { x: 2, y: 4, direction: 'south' },
            { x: 0, y: 2, direction: 'west' },
            { x: 4, y: 2, direction: 'east' }
        ],
        decorations: []
    },

    SMALL_PILLAR: {
        name: "Small Pillar Room",
        width: 5,
        height: 5,
        pattern: [
            [1,1,1,1,1],
            [1,2,2,2,1],
            [1,2,15,2,1],
            [1,2,2,2,1],
            [1,1,1,1,1]
        ],
        entrances: [
            { x: 2, y: 0, direction: 'north' },
            { x: 2, y: 4, direction: 'south' },
            { x: 0, y: 2, direction: 'west' },
            { x: 4, y: 2, direction: 'east' }
        ],
        decorations: [
            { x: 2, y: 2, type: 'pillar' }
        ]
    },

    SMALL_TREASURE: {
        name: "Small Treasure Room",
        width: 5,
        height: 5,
        pattern: [
            [1,1,1,1,1],
            [1,2,2,2,1],
            [1,2,15,2,1],
            [1,2,2,2,1],
            [1,1,1,1,1]
        ],
        entrances: [
            { x: 2, y: 0, direction: 'north' }
        ],
        decorations: [
            { x: 2, y: 2, type: 'chest' }
        ]
    },

    // Medium Rooms (7x7)
    MEDIUM_EMPTY: {
        name: "Medium Empty Room",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 3, y: 0, direction: 'north' },
            { x: 3, y: 6, direction: 'south' },
            { x: 0, y: 3, direction: 'west' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: []
    },

    MEDIUM_FOUR_PILLARS: {
        name: "Medium Four Pillars",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,2,2,2,2,2,1],
            [1,2,15,2,15,2,1],
            [1,2,2,2,2,2,1],
            [1,2,15,2,15,2,1],
            [1,2,2,2,2,2,1],
            [1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 3, y: 0, direction: 'north' },
            { x: 3, y: 6, direction: 'south' },
            { x: 0, y: 3, direction: 'west' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: [
            { x: 2, y: 2, type: 'pillar' },
            { x: 4, y: 2, type: 'pillar' },
            { x: 2, y: 4, type: 'pillar' },
            { x: 4, y: 4, type: 'pillar' }
        ]
    },

    MEDIUM_CENTER_PIECE: {
        name: "Medium Center Piece",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,15,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 3, y: 0, direction: 'north' },
            { x: 3, y: 6, direction: 'south' },
            { x: 0, y: 3, direction: 'west' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: [
            { x: 3, y: 3, type: 'statue' }
        ]
    },

    // Large Rooms (9x9)
    LARGE_EMPTY: {
        name: "Large Empty Room",
        width: 9,
        height: 9,
        pattern: [
            [1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 4, y: 0, direction: 'north' },
            { x: 4, y: 8, direction: 'south' },
            { x: 0, y: 4, direction: 'west' },
            { x: 8, y: 4, direction: 'east' }
        ],
        decorations: []
    },

    LARGE_NINE_PILLARS: {
        name: "Large Nine Pillars",
        width: 9,
        height: 9,
        pattern: [
            [1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,15,2,15,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 4, y: 0, direction: 'north' },
            { x: 4, y: 8, direction: 'south' },
            { x: 0, y: 4, direction: 'west' },
            { x: 8, y: 4, direction: 'east' }
        ],
        decorations: [
            { x: 2, y: 2, type: 'pillar' },
            { x: 4, y: 2, type: 'pillar' },
            { x: 6, y: 2, type: 'pillar' },
            { x: 2, y: 4, type: 'pillar' },
            { x: 6, y: 4, type: 'pillar' },
            { x: 2, y: 6, type: 'pillar' },
            { x: 4, y: 6, type: 'pillar' },
            { x: 6, y: 6, type: 'pillar' },
            { x: 4, y: 4, type: 'pillar' }
        ]
    },

    // Corridors
    CORRIDOR_STRAIGHT_3: {
        name: "Straight Corridor (3-wide)",
        width: 3,
        height: 7,
        pattern: [
            [1,2,1],
            [1,2,1],
            [1,2,1],
            [1,2,1],
            [1,2,1],
            [1,2,1],
            [1,2,1]
        ],
        entrances: [
            { x: 1, y: 0, direction: 'north' },
            { x: 1, y: 6, direction: 'south' }
        ],
        decorations: []
    },

    CORRIDOR_STRAIGHT_5: {
        name: "Straight Corridor (5-wide)",
        width: 5,
        height: 7,
        pattern: [
            [1,1,2,1,1],
            [1,1,2,1,1],
            [1,1,2,1,1],
            [1,1,2,1,1],
            [1,1,2,1,1],
            [1,1,2,1,1],
            [1,1,2,1,1]
        ],
        entrances: [
            { x: 2, y: 0, direction: 'north' },
            { x: 2, y: 6, direction: 'south' }
        ],
        decorations: []
    },

    CORRIDOR_L_SHAPE: {
        name: "L-Shaped Corridor",
        width: 7,
        height: 7,
        pattern: [
            [1,1,2,1,1,1,1],
            [1,1,2,1,1,1,1],
            [1,1,2,1,1,1,1],
            [1,1,2,2,2,2,1],
            [1,1,1,1,1,2,1],
            [1,1,1,1,1,2,1],
            [1,1,1,1,1,2,1]
        ],
        entrances: [
            { x: 2, y: 0, direction: 'north' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: []
    },

    CORRIDOR_T_SHAPE: {
        name: "T-Shaped Corridor",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1],
            [2,2,2,2,2,2,2],
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1],
            [1,1,1,1,1,1,1]
        ],
        entrances: [
            { x: 3, y: 0, direction: 'north' },
            { x: 0, y: 3, direction: 'west' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: []
    },

    CORRIDOR_CROSS: {
        name: "Cross Corridor",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1],
            [2,2,2,2,2,2,2],
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1],
            [1,1,1,2,1,1,1]
        ],
        entrances: [
            { x: 3, y: 0, direction: 'north' },
            { x: 3, y: 6, direction: 'south' },
            { x: 0, y: 3, direction: 'west' },
            { x: 6, y: 3, direction: 'east' }
        ],
        decorations: []
    },

    // Special Rooms
    SHOP_ROOM: {
        name: "Shop Room",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,2,2,2,2,2,1],
            [1,2,15,2,15,2,1],
            [1,2,2,15,2,2,1],
            [1,2,15,2,15,2,1],
            [1,2,2,2,2,2,1],
            [1,1,1,3,1,1,1]
        ],
        entrances: [
            { x: 3, y: 6, direction: 'south' }
        ],
        decorations: [
            { x: 3, y: 3, type: 'shopkeeper' },
            { x: 2, y: 2, type: 'shelf' },
            { x: 4, y: 2, type: 'shelf' },
            { x: 2, y: 4, type: 'shelf' },
            { x: 4, y: 4, type: 'shelf' }
        ],
        special: 'shop'
    },

    TREASURE_ROOM: {
        name: "Treasure Room",
        width: 9,
        height: 9,
        pattern: [
            [1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,2,15,15,15,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,1],
            [1,1,1,3,1,1,1,1,1]
        ],
        entrances: [
            { x: 4, y: 8, direction: 'south' }
        ],
        decorations: [
            { x: 4, y: 4, type: 'large_chest' },
            { x: 2, y: 2, type: 'chest' },
            { x: 4, y: 2, type: 'chest' },
            { x: 6, y: 2, type: 'chest' },
            { x: 2, y: 4, type: 'chest' },
            { x: 6, y: 4, type: 'chest' },
            { x: 2, y: 6, type: 'chest' },
            { x: 4, y: 6, type: 'chest' },
            { x: 6, y: 6, type: 'chest' }
        ],
        special: 'treasure'
    },

    BOSS_ROOM: {
        name: "Boss Room",
        width: 11,
        height: 11,
        pattern: [
            [1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,15,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,2,2,1],
            [1,2,15,2,15,2,15,2,15,2,1],
            [1,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,3,1,1,1,1,1]
        ],
        entrances: [
            { x: 5, y: 10, direction: 'south' }
        ],
        decorations: [
            { x: 5, y: 5, type: 'boss_spawn' },
            { x: 2, y: 2, type: 'pillar' },
            { x: 4, y: 2, type: 'pillar' },
            { x: 6, y: 2, type: 'pillar' },
            { x: 8, y: 2, type: 'pillar' },
            { x: 2, y: 4, type: 'pillar' },
            { x: 8, y: 4, type: 'pillar' },
            { x: 2, y: 6, type: 'pillar' },
            { x: 8, y: 6, type: 'pillar' },
            { x: 2, y: 8, type: 'pillar' },
            { x: 4, y: 8, type: 'pillar' },
            { x: 6, y: 8, type: 'pillar' },
            { x: 8, y: 8, type: 'pillar' }
        ],
        special: 'boss'
    },

    ENTRANCE_ROOM: {
        name: "Entrance Room",
        width: 7,
        height: 7,
        pattern: [
            [1,1,1,1,1,1,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,15,2,2,1],
            [1,2,2,2,2,2,1],
            [1,2,2,2,2,2,1],
            [1,1,1,4,1,1,1]
        ],
        entrances: [
            { x: 3, y: 6, direction: 'south' }
        ],
        decorations: [
            { x: 3, y: 3, type: 'entrance_statue' }
        ],
        special: 'entrance'
    }
};

// Tile type legend for reference:
// 0 = Empty, 1 = Wall, 2 = Floor, 3 = Door, 4 = Stairs Up, 5 = Stairs Down
// 6 = Water, 7 = Lava, 8 = Pit, 9 = Grass, 10 = Stone, 11 = Wood, 12 = Brick
// 13 = Cave Wall, 14 = Cave Floor, 15 = Decoration (pillar, statue, etc.)

export const RoomCategories = {
    SMALL: ['SMALL_EMPTY', 'SMALL_PILLAR', 'SMALL_TREASURE'],
    MEDIUM: ['MEDIUM_EMPTY', 'MEDIUM_FOUR_PILLARS', 'MEDIUM_CENTER_PIECE'],
    LARGE: ['LARGE_EMPTY', 'LARGE_NINE_PILLARS'],
    CORRIDOR: ['CORRIDOR_STRAIGHT_3', 'CORRIDOR_STRAIGHT_5', 'CORRIDOR_L_SHAPE', 'CORRIDOR_T_SHAPE', 'CORRIDOR_CROSS'],
    SPECIAL: ['SHOP_ROOM', 'TREASURE_ROOM', 'BOSS_ROOM', 'ENTRANCE_ROOM']
};

export function getRandomTemplate(category) {
    const templates = RoomCategories[category] || RoomCategories.SMALL;
    const templateName = templates[Math.floor(Math.random() * templates.length)];
    return RoomTemplates[templateName];
}

export function getAllTemplates() {
    return RoomTemplates;
}
