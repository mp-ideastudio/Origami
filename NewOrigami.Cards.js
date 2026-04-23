const MasterCardDatabase = {
    // --- EARTH (STUN / HEAVY DAMAGE) ---
    'BOULDER': {
        id: 'EARTH', kanji: '地', icon: 'fa-mountain', 
        desc: 'Spell Scroll', attr: '(STUN * 2DICE)',
        fpvColor: 0x8B4513, fpvDmg: 20, fpvTrauma: 0.6, fpvRange: 5.0, label: '🪨 BOULDER',
        type: 'combat'
    },
    'FISSURE': {
        id: 'EARTH', kanji: '地', icon: 'fa-mountain', 
        desc: 'Spell Scroll', attr: '(STUN * 2DICE)',
        fpvColor: 0x5C4033, fpvDmg: 35, fpvTrauma: 0.9, fpvRange: 4.0, label: '🌋 FISSURE',
        type: 'combat'
    },
    
    // --- WIND (PUSH / RANGE) ---
    'GALE': {
        id: 'WIND', kanji: '風', icon: 'fa-wind', 
        desc: 'Spell Scroll', attr: '(PUSH * 3DICE)',
        fpvColor: 0xaaaaaa, fpvDmg: 15, fpvTrauma: 0.4, fpvRange: 10.0, label: '🌪️ GALE',
        type: 'combat'
    },

    // --- FIRE (RAW DAMAGE) ---
    'FIREBALL': {
        id: 'FIRE', kanji: '火', icon: 'fa-fire', 
        desc: 'Magic Wand', attr: '(DMG * 4DICE)',
        fpvColor: 0xff4400, fpvDmg: 30, fpvTrauma: 0.7, fpvRange: 8.0, label: '🔥 FIREBALL',
        type: 'combat'
    },
    'PYROBLAST': {
        id: 'FIRE', kanji: '火', icon: 'fa-fire', 
        desc: 'Magic Wand', attr: '(DMG * 4DICE)',
        fpvColor: 0xff2200, fpvDmg: 50, fpvTrauma: 0.9, fpvRange: 8.0, label: '💥 PYROBLAST',
        type: 'combat'
    },
    'COMET': {
        id: 'FIRE', kanji: '火', icon: 'fa-fire', 
        desc: 'Magic Wand', attr: '(DMG * 4DICE)',
        fpvColor: 0xffaa00, fpvDmg: 70, fpvTrauma: 1.0, fpvRange: 12.0, label: '☄️ COMET',
        type: 'combat'
    },

    // --- WATER (SLOW / ICE) ---
    'TIDE': {
        id: 'WATER', kanji: '水', icon: 'fa-water', 
        desc: 'Spell Scroll', attr: '(SLOW * 3DICE)',
        fpvColor: 0x0088ff, fpvDmg: 20, fpvTrauma: 0.3, fpvRange: 6.0, label: '🌊 TIDE',
        type: 'combat'
    },
    'SURGE': {
        id: 'WATER', kanji: '水', icon: 'fa-water', 
        desc: 'Spell Scroll', attr: '(SLOW * 3DICE)',
        fpvColor: 0x0044ff, fpvDmg: 25, fpvTrauma: 0.5, fpvRange: 7.0, label: '💧 SURGE',
        type: 'combat'
    },

    // --- MELEE WEAPONS ---
    'SLASH': {
        id: 'KATANA', kanji: '斬', icon: 'fa-fire', 
        desc: 'Melee Weapon', attr: '(DMG * 1DICE)',
        fpvColor: 0xaaaaaa, fpvDmg: 15, fpvTrauma: 0.2, fpvRange: 2.0, label: '⚔️ SLASH',
        type: 'combat'
    },
    'THRUST': {
        id: 'KATANA', kanji: '突', icon: 'fa-wind', 
        desc: 'Melee Weapon', attr: '(DMG * 1DICE)',
        fpvColor: 0xdddddd, fpvDmg: 20, fpvTrauma: 0.3, fpvRange: 3.0, label: '🗡️ THRUST',
        type: 'combat'
    },
    'STRONG ATTACK': {
        id: 'KATANA', kanji: '強', icon: 'fa-mountain', 
        desc: 'Melee Weapon', attr: '(DMG * 3DICE)',
        fpvColor: 0x888888, fpvDmg: 40, fpvTrauma: 0.8, fpvRange: 2.0, label: '💥 STRONG ATTACK',
        type: 'combat'
    },

    // --- RANGED WEAPONS ---
    'SHURIKEN': {
        id: 'MISSILE', kanji: '投', icon: 'fa-star', 
        desc: 'Thrown Weapon', attr: '(DMG * 1DICE)',
        fpvColor: 0x666666, fpvDmg: 10, fpvTrauma: 0.1, fpvRange: 15.0, label: '⭐ SHURIKEN',
        type: 'combat'
    },
    'SHORT BOW': {
        id: 'MISSILE', kanji: '弓', icon: 'fa-bow-arrow', 
        desc: 'Ranged Weapon', attr: '(DMG * 2DICE)',
        fpvColor: 0x8B4513, fpvDmg: 20, fpvTrauma: 0.2, fpvRange: 20.0, label: '🏹 SHORT BOW',
        type: 'combat'
    },
    'LONG BOW': {
        id: 'MISSILE', kanji: '長', icon: 'fa-bow-arrow', 
        desc: 'Ranged Weapon', attr: '(DMG * 4DICE)',
        fpvColor: 0x5C4033, fpvDmg: 35, fpvTrauma: 0.4, fpvRange: 30.0, label: '🏹 LONG BOW',
        type: 'combat'
    },

    // --- ARMOR & DEFENSE ---
    'SHIELD': {
        id: 'SHIELD', kanji: '盾', icon: 'fa-water', 
        desc: 'Armor', attr: '(DEFEND * 2DICE)',
        fpvColor: 0x4444ff, fpvDmg: 0, fpvTrauma: 0.0, fpvRange: 0.0, label: '🛡️ SHIELD',
        type: 'combat'
    },

    // --- ITEMS & CONSUMABLES ---
    'HEAL POTION': {
        id: 'ITEM', kanji: '具', icon: 'fa-flask', 
        desc: 'Consumable', attr: '(RESTORE)',
        fpvColor: 0x00ff00, fpvDmg: -30, fpvTrauma: 0.0, fpvRange: 0.0, label: '🧪 HEAL POTION',
        type: 'inventory'
    },
    'SCROLL OF IDENTITY': {
        id: 'ITEM', kanji: '具', icon: 'fa-flask', 
        desc: 'Consumable', attr: '(REVEAL)',
        fpvColor: 0xaa00aa, fpvDmg: 0, fpvTrauma: 0.0, fpvRange: 0.0, label: '📜 SCROLL OF IDENTITY',
        type: 'inventory'
    }
};

window.MasterCardDatabase = MasterCardDatabase;
