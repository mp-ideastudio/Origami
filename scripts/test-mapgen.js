#!/usr/bin/env node
/**
 * Test MapGen.js to verify the compact layout works
 */

import { generateDungeonMap } from '../js/v8/map/MapGen.js';

console.log('Testing MapGen.js compact layout...\n');

// Test level 1 (regular room)
const level1 = generateDungeonMap(1, 64, 64);
console.log(`Level 1: ${level1.rooms.length} rooms`);
level1.rooms.forEach(r => console.log(`  - ${r.roomName} (${r.w}x${r.h})`));

// Test level 7 (OniBaba throne)
const level7 = generateDungeonMap(7, 64, 64);
console.log(`\nLevel 7: ${level7.rooms.length} rooms`);
level7.rooms.forEach(r => console.log(`  - ${r.roomName} (${r.w}x${r.h}) ${r.isOniBaba ? '[ONI-BABA]' : ''}`));

// Test level 20 (should be regular)
const level20 = generateDungeonMap(20, 64, 64);
console.log(`\nLevel 20: ${level20.rooms.length} rooms`);
level20.rooms.forEach(r => console.log(`  - ${r.roomName} (${r.w}x${r.h})`));

console.log('\nMap generation test complete!');