# New Tile-Based Dungeon Architecture

## Overview
Complete refactor of the map system while preserving panels, PIP, and event systems.

## Core Components

### 1. Tile System
- **Tile Types**: wall, floor, door, stairs_up, stairs_down, water, lava, pit
- **Tile Size**: 2x2 units (maintains current gridSize)
- **Tile Rendering**: Single mesh per tile type with instanced rendering
- **Visual Varieties**: Multiple textures per tile type for variety

### 2. Room Templates
Based on reference game patterns:
- **Small Rooms**: 5x5, 7x7 tiles
- **Large Rooms**: 9x9, 11x11 tiles  
- **Corridors**: 3-wide, 5-wide straight and L-shaped
- **Special Rooms**: Shop, treasure, boss arenas
- **Junction Rooms**: T-shaped, cross-shaped intersections

### 3. Dungeon Generation
- **Modular Assembly**: Connect pre-designed room templates
- **Logical Flow**: Ensure playable layouts with proper progression
- **Theme Layers**: Apply visual themes (stone, brick, cave, etc.)
- **Entity Placement**: Strategic enemy and loot positioning

### 4. Rendering System
- **Instanced Meshes**: One mesh per tile type, rendered many times
- **Level of Detail**: High-detail for FPV, optimized for top-down
- **Light Integration**: Preserve existing lighting system
- **Shadow Mapping**: Efficient shadow casting for tile geometry

### 5. Preservation Targets
- ✅ **Panels System**: All UI panels and interactions
- ✅ **PIP System**: Picture-in-picture functionality
- ✅ **Event System**: Triggers, combat, loot, narrative
- ✅ **Player Controls**: Movement, interaction, camera
- ✅ **Audio System**: Sound effects and music
- ✅ **Save/Load**: Game state persistence

## Implementation Plan

### Phase 1: Core Tile System
1. Create tile type definitions and textures
2. Implement tile-based world data structure
3. Build instanced rendering system
4. Test basic tile placement and rendering

### Phase 2: Room Templates
1. Design room template system
2. Create template library (rooms, corridors, specials)
3. Implement template placement logic
4. Add room connection algorithms

### Phase 3: Dungeon Generation
1. Build procedural dungeon generator
2. Implement theme system
3. Add entity placement logic
4. Test dungeon variety and playability

### Phase 4: Integration
1. Integrate with existing systems
2. Test FPV and top-down views
3. Validate event system compatibility
4. Performance optimization

## Visual Design
- **Ground Tiles**: Stone, brick, wood, cave floor
- **Wall Tiles**: Stone blocks, brick walls, cave walls
- **Special Tiles**: Water, lava, pits, stairs
- **Decorative Elements**: Pillars, arches, details
- **Atmosphere**: Lighting, fog, particle effects

## Technical Benefits
- **Performance**: Instanced rendering for better FPS
- **Memory**: Reduced geometry complexity
- **Modularity**: Easy to add new tile types and rooms
- **Maintainability**: Cleaner code structure
- **Extensibility**: Simple to add new features

## Backward Compatibility
- Existing save games will be converted
- All current features preserved
- Smooth migration path
- Rollback capability if needed
