/**
 * CardExecutor.js — T0.1.D extraction from NewOrigami.Engine8.html
 *
 * Combat damage tables and card classification helpers.
 * No Three.js dependency. No shared mutable state.
 *
 * Exports:
 *   MISSILE_TABLE, CARD_TYPES, EL_COLORS       — data constants
 *   cardElement(name)                           — element string from card name
 *   cardCategory(name)                          — category string from card name
 *   getMissileTable(cardName)                   — returns missile stats object
 *   isMissileCard(name)                         — boolean
 *   isShurikenCard(name)                        — boolean
 *   createCombatCalc(getDungeonLevel, getPlayerStats)
 *       → { calcDamage, calcMissileDamage, calcSpellDamage }
 *
 * Wire-up pattern in Engine8.html:
 *   const { calcDamage, calcMissileDamage, calcSpellDamage } =
 *       createCombatCalc(() => DUNGEON_LEVEL, () => playerStats);
 */

// ── Data constants ─────────────────────────────────────────────────────────────

/** Missile damage tables: { min, max, crit, critMult }
 *  PISTOL is the only firearm and keeps its full damage band. All other
 *  missile weapons take a flat 50% damage cut per user (shuriken / bows /
 *  daggers / arrows / crossbows / DEFAULT). The crit chance + mult are
 *  unchanged — only base min/max are halved.
 */
export const MISSILE_TABLE = {
    SHURIKEN:  { min: 5, max:15,  crit:0.20, critMult:2.0 },   // was 10-30
    SHORT_BOW: { min:10, max:21,  crit:0.15, critMult:1.8 },   // was 21-42
    LONG_BOW:  { min:14, max:35,  crit:0.12, critMult:2.2 },   // was 28-70
    PISTOL:    { min:20, max:60,  crit:0.30, critMult:2.5 },   // unchanged — firearm exception
    DEFAULT:   { min: 5, max:12,  crit:0.10, critMult:1.5 }    // was 10-25
};

/** Non-missile card types (melee / items): { baseDmg, scaling } */
export const CARD_TYPES = {
    SPELL:   { baseDmg:10, scaling:1.0 }, // overridden by calcSpellDamage
    COMBAT:  { baseDmg:14, scaling:1.1 },
    ITEM:    { baseDmg:6,  scaling:0.8 },
    SLASH:   { baseDmg:16, scaling:1.2 },
    DEFAULT: { baseDmg:10, scaling:1.0 }
};

/** Elemental colour palette for projectile VFX */
export const EL_COLORS = {
    FIRE:    { beam:0xff5500, spark:0xffaa00, hit:0xff2200 },
    WATER:   { beam:0x00aaff, spark:0x88ddff, hit:0x0066ff },
    EARTH:   { beam:0x885522, spark:0xccaa55, hit:0x553300 },
    WIND:    { beam:0x88ffcc, spark:0xccffee, hit:0x44ddaa },
    VOID:    { beam:0xaa00ff, spark:0xff88ff, hit:0x6600cc },
    DEFAULT: { beam:0xffffff, spark:0xddffff, hit:0xaaaaff }
};

// ── Pure classification helpers ────────────────────────────────────────────────

/** Returns elemental string ('FIRE', 'WATER', 'EARTH', 'WIND', 'VOID', 'DEFAULT') */
export function cardElement(name) {
    const n = (name || '').toUpperCase();
    if (/FIRE|FLAME|INFERNO|PYRO/.test(n))        return 'FIRE';
    if (/WATER|WAVE|AQUA|TIDE|FLOOD/.test(n))     return 'WATER';
    if (/EARTH|ROCK|STONE|BOULDER|QUAKE/.test(n)) return 'EARTH';
    if (/WIND|AIR|STORM|GALE|CYCLONE/.test(n))    return 'WIND';
    if (/VOID|SHADOW|DARK|DEATH/.test(n))         return 'VOID';
    return 'DEFAULT';
}

/** Returns category string ('SPELL', 'COMBAT', 'ITEM', 'MISSILE', 'DEFAULT') */
export function cardCategory(name) {
    const n = (name || '').toUpperCase();
    if (/FIREBALL|LIGHTNING|SPELL|ARCANE|BOLT|BLAST|NOVA/.test(n))   return 'SPELL';
    if (/SLASH|STRIKE|THRUST|HEAVY|HARD|SWORD|KATANA|BLADE/.test(n))
      return "COMBAT";
    if (/POTION|SCROLL|LANTERN|ITEM|RING/.test(n))                    return 'ITEM';
    if (/BOW|SHURIKEN|DAGGER|ARROW|CROSSBOW|MISSILE|PISTOL|GUN|FIREARM/.test(n)) return 'MISSILE';
    return 'DEFAULT';
}

/** Returns a copy of the appropriate MISSILE_TABLE entry for the named card */
export function getMissileTable(cardName) {
    const n = (cardName || '').toUpperCase();
    // PISTOL/GUN must match before generic BOW/etc patterns. Falling through
    // to DEFAULT (10–25 dmg) made the firearm hit softer than a shuriken.
    if (/PISTOL|FIREARM|GUN|REVOLVER|MAGIC MISSILE/.test(n)) return { ...MISSILE_TABLE.PISTOL,    isCrit: false };
    if (/SHURIKEN|THROWING STAR/.test(n))                    return { ...MISSILE_TABLE.SHURIKEN,  isCrit: false };
    if (/LONG BOW|LONGBOW/.test(n))                          return { ...MISSILE_TABLE.LONG_BOW,  isCrit: false };
    if (/SHORT BOW|SHORTBOW/.test(n))                        return { ...MISSILE_TABLE.SHORT_BOW, isCrit: false };
    if (/CROSS ?BOW/.test(n))                                return { ...MISSILE_TABLE.SHORT_BOW, isCrit: false };
    return { ...MISSILE_TABLE.DEFAULT, isCrit: false };
}

/** Returns true if the card fires a projectile */
export function isMissileCard(name) {
    const n = (name || '').toUpperCase();
    return /LONG BOW|LONGBOW|SHORT BOW|SHORTBOW|BOW|SHURIKEN|CROSSBOW|BOLT|DAGGER|THROWING|PISTOL|GUN|FIREARM/.test(n);
}

/** Returns true if the card specifically throws a shuriken */
export function isShurikenCard(name) {
    return /SHURIKEN|THROWING STAR|STAR/.test((name || '').toUpperCase());
}

// ── Damage calculation factory ─────────────────────────────────────────────────

/**
 * createCombatCalc(getDungeonLevel, getPlayerStats)
 *
 * Returns damage calculation functions that close over live references to
 * DUNGEON_LEVEL and playerStats. Pass getter lambdas so the module never
 * holds stale copies of mutable game state.
 *
 * @param {() => number}  getDungeonLevel  - () => DUNGEON_LEVEL
 * @param {() => {level:number, skill:number}} getPlayerStats - () => playerStats
 * @returns {{ calcDamage, calcMissileDamage, calcSpellDamage }}
 */
export function createCombatCalc(getDungeonLevel, getPlayerStats) {
    function calcMissileDamage(cardName) {
        const tbl = getMissileTable(cardName);
        // dungeon level scales the max range up by 10% per level, keeps level 1 easy
        const dungScale = 1 + (getDungeonLevel() - 1) * 0.10;
        const lo = tbl.min;
        const hi = Math.round(tbl.max * dungScale);
        let dmg = lo + Math.floor(Math.random() * (hi - lo + 1));
        const isCrit = Math.random() < tbl.crit;
        if (isCrit) dmg = Math.round(dmg * tbl.critMult);
        return { dmg, isCrit };
    }

    // Per-card dice count + flat base. Mirrors the card's `attr` ("DMG * NDICE")
    // and now applies a +50% damage bump so spells hit hard enough to be
    // worth casting. Each die is d20. Vulnerability is clamped to ≥0.70 in
    // _applyMonsterDamage, so the WORST resisted hit still beats a shuriken.
    //   • Shuriken (baseline):                 1d20 + 10   (10–30)
    //   • 3-dice spells (Tide / Surge / Gale): 3d20 + 23   (26–113)
    //   • 4-dice spells (Fireball / Pyroblast / Comet / Fissure):
    //                                          4d20 + 38   (42–158)
    // BOULDER and TIDE wave roll per-monster in their own systems and apply
    // a separate ×1.5 multiplier — see tickBoulders + tickTideWaves.
    const SPELL_DICE = {
      // 4-dice
      FIREBALL: 4, PYROBLAST: 4, COMET: 4, FISSURE: 4, BOULDER: 4,
      // 3-dice
      TIDE: 3, SURGE: 3, GALE: 3,
    };
    function _rollDice(count, sides){
      let total = 0;
      for(let i=0;i<count;i++) total += 1 + Math.floor(Math.random()*sides);
      return total;
    }
    function calcSpellDamage(cardName) {
      const upper = (cardName || '').toUpperCase().trim();
      const dice  = SPELL_DICE[upper] || 3;
      // Base bumped +50% over the prior values (15→23, 25→38)
      const base  = dice === 4 ? 38 : 23;
      return _rollDice(dice, 20) + base;
    }

    function calcDamage(cardName) {
        // Missiles are handled separately via calcMissileDamage
        if (isMissileCard(cardName)) return calcMissileDamage(cardName).dmg;
        const cat = cardCategory(cardName);
        if (cat === 'SPELL') return calcSpellDamage(cardName);
        const { baseDmg, scaling } = CARD_TYPES[cat] || CARD_TYPES.DEFAULT;
        const lvlBonus = 1 + (getPlayerStats().level - 1) * 0.12;
        const dungMult = 1 + (getDungeonLevel() - 1) * 0.10;
        const raw = baseDmg * scaling * lvlBonus * dungMult;
        const roll = 0.80 + Math.random() * 0.40;
        return Math.round(raw * roll);
    }

    return { calcDamage, calcMissileDamage, calcSpellDamage };
}

export default createCombatCalc;
