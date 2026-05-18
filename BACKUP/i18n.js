/**
 * i18n.js — Origami Localization Module
 *
 * Structure:
 *   window.OrigamiI18n = { LANG_CODE: { ui: {key:str}, cards: {id: {name,desc,attr}} } }
 *
 * To add a language: add a new top-level key (e.g. 'zh', 'ko', 'fr')
 * with the same shape. Missing keys fall back to 'en'.
 *
 * Applied via applyLocale(lang) which:
 *   - Sets text on all [data-i18n="key"] elements
 *   - Sets placeholder on [data-i18n-placeholder="key"] elements
 *   - Triggers a LOCALE_CHANGE event so the card deck re-renders
 */

window.OrigamiI18n = {
  // ── English (default) ────────────────────────────────────────────────────
  en: {
    ui: {
      // Side panels
      "enemy-label": "ENEMY",
      "dist-unit": "ft",
      "btn-wager": "Wager",
      "btn-parley": "Came to Play",
      "btn-hide": "Hide",
      "btn-attack": "Attack",
      "btn-retreat": "Retreat",
      "btn-observe": "Observe",
      "player-label": "PLAYER",
      "gold-label": "GOLD",
      "xp-label": "XP",
      // Action ring
      "act-mode": "Mode",
      "act-bag": "Bag",
      "act-map": "Map",
      "act-settings": "Settings",
      "act-rest": "Rest",
      "act-heal": "Heal",
      "act-view": "View",
      "act-log": "Log",
      // Compass
      "compass-n": "N",
      "compass-s": "S",
      "compass-e": "E",
      "compass-w": "W",
      // Turn indicator
      "turn-player": "PLAYER TURN",
      "turn-monster": "ENEMY TURN",
      // Exit modal
      "exit-title": "EXIT DUNGEON?",
      // Wager cards
      "wager-bet-even": "BET EVEN",
      "wager-bet-odd": "BET ODD",
      "wager-desc": "Double your coins.",
      "wager-pays": "(PAYS 1:1)",
      // Chat
      "chat-placeholder": "Type here...",
      // Viewport
      "viewport-label": "VIEWPORT",
    },
    cards: {
      boulder: {
        name: "BOULDER",
        desc: "Heavy impact.",
        attr: "(STUN × 2DICE)",
      },
      fissure: {
        name: "FISSURE",
        desc: "Ground breaking.",
        attr: "(STUN × 2DICE)",
      },
      gale: { name: "GALE", desc: "Forceful gust.", attr: "(PUSH × 3DICE)" },
      fireball: {
        name: "FIREBALL",
        desc: "Inferno star.",
        attr: "(DMG × 4DICE)",
      },
      pyroblast: {
        name: "PYROBLAST",
        desc: "Massive fire damage.",
        attr: "(DMG × 6DICE)",
      },
      comet: {
        name: "COMET",
        desc: "Rains from above.",
        attr: "(DMG × 8DICE)",
      },
      tide: { name: "TIDE", desc: "Washes away foes.", attr: "(SLOW × 3DICE)" },
      surge: { name: "SURGE", desc: "Crashing wave.", attr: "(DMG × 3DICE)" },
      shuriken: {
        name: "SHURIKEN",
        desc: "Ranged attack.",
        attr: "(DMG × 2DICE)",
      },
      short_bow: {
        name: "SHORT BOW",
        desc: "Quick arrow.",
        attr: "(DMG × 2DICE)",
      },
      long_bow: {
        name: "LONG BOW",
        desc: "Piercing shot.",
        attr: "(DMG × 4DICE)",
      },
      slash: { name: "SLASH", desc: "Basic slash.", attr: "(DMG × 1DICE)" },
      thrust: { name: "THRUST", desc: "Quick poke.", attr: "(DMG × 1DICE)" },
      strong_attack: {
        name: "HARD ATTACK",
        desc: "Hard blow.",
        attr: "(DMG × 4DICE, -25% HIT)",
      },
      heal_potion: {
        name: "HEAL POTION",
        desc: "Consumable.",
        attr: "(HP + 20)",
      },
      potion: { name: "POTION", desc: "Consumable.", attr: "(HP + 20)" },
      scroll_identity: {
        name: "SCROLL OF IDENTITY",
        desc: "Reveals truth.",
        attr: "(REVEAL)",
      },
      shield: { name: "SHIELD", desc: "Raises AC.", attr: "(AC + 5)" },
      samurai_helmet: {
        name: "SAMURAI HELMET",
        desc: "+15 DEF.",
        attr: "(EQUIP)",
      },
      magic_lantern: {
        name: "MAGIC LANTERN",
        desc: "Light your way.",
        attr: "(EQUIP)",
      },
      wand_of_fireballs: {
        name: "WAND OF FIREBALLS",
        desc: "Bazooka.",
        attr: "(DMG × 6DICE)",
      },
      wand_of_magic_missiles: {
        name: "WAND OF MAGIC MISSILES",
        desc: "9mm Glock.",
        attr: "(DMG × 3DICE)",
      },
      tommy_gun: {
        name: "TOMMY GUN",
        desc: "Mobster firepower.",
        attr: "(DMG × 8DICE)",
      },
      gold_coin: { name: "GOLD COIN", desc: "Wealth.", attr: "+50 GOLD" },
      gold_coins: { name: "GOLD COINS", desc: "Wealth.", attr: "+50 GOLD" },
      pistol: { name: "MAGIC MISSILE", desc: "Arcane projectile.", attr: "20-60 DMG" },
      dagger: { name: "DAGGER", desc: "Quick throw.", attr: "10-25 DMG" },
      crossbow: { name: "CROSSBOW", desc: "Steady aim.", attr: "21-42 DMG" },
      katana: { name: "KATANA", desc: "Cleave strike.", attr: "MELEE" },
      blade: { name: "BLADE", desc: "Sharp slash.", attr: "MELEE" },
      hard_attack: { name: "HARD ATTACK", desc: "Heavy hit.", attr: "MELEE" },
      cyclone: { name: "CYCLONE", desc: "Seeks & spins.", attr: "3DICE+23" },
      stamina_potion: { name: "STAMINA POTION", desc: "Boost vigor.", attr: "+10 STA" },
      scroll: { name: "SCROLL", desc: "Arcane page.", attr: "EQUIP" },
    },
    // ── Monster display names ───────────────────────────────────────────
    monsters: {
      yakuza_goblin:     "Yakuza Goblin",
      yakuza_imp:        "Yakuza Imp",
      yakuza_supervisor: "Yakuza Level Supervisor",
      oni_baba:          "Oni-Baba, the Dragon Princess",
    },
    // ── Common log fragments. Use t('log.<key>', {p1: ...}) — tokens
    //     like {name} and {n} are substituted from the params object. ──
    log: {
      "monster-falls":        "⚔ <b>{name}</b> is defeated.",
      "monster-falls-fleeing":"💀 <b>{name}</b> is slain while fleeing.",
      "monster-haunted-bonus": "👻 The spirit's fury surges through this body.",
      "room-cleared":         "🗝 Room cleared.",
      "level-up":             "✨ <b>LEVEL UP!</b> You are now level <b>{n}</b>.",
      "xp-gold":              "+{xp} XP &nbsp;·&nbsp; +{gold} gold",
      "loot-pickup":          "Picked up {item}!",
      "auto-walk-engaged":    "⮕ Auto-walk engaged. Tap S/Down or any action to stop.",
      "auto-walk-stopped":    "⏹ Auto-walk stopped — enemy nearby!",
      "auto-walk-room":       "⏹ Auto-walk paused — new room.",
      "no-target":            "🎯 No target in view.",
      "target":               "🎯 Target: <b>{name}</b>",
      "auto-target":          "🎯 Auto-target: <b>{name}</b>",
      "headshot":             "🎯 <b>HEADSHOT</b> on {name} — +{bonus} bonus.",
      // ── Oni-Baba event log strings ───────────────────────────────────
      "oni.seal-passages":    "Oni-Baba seals {n} passage{s} with dark stone.",
      "oni.cruelty":          "CRUELTY! Oni-Baba watches you strike a surrendered foe.",
      "oni.hive-dodge":       "The Hive anticipated your {atk}! Monster DODGED!",
      "oni.surrender":        "The monster drops its weapon and begs for mercy!",
      "oni.retaliate":        "Monster retaliates for {dmg} damage!",
      "oni.kill-witness":     "Oni-Baba witnesses the kill. −1 Karma.",
      "oni.spirit-drifts":    "👻 {name}'s spirit drifts toward Oni-Baba…",
      "oni.grudge-whisper":   "🕯 Oni-Baba whispers grudges into {n} body{s} on this floor.",
      "oni.parley-pleased":   "You share understanding. Oni-Baba is pleased.",
      "oni.parley-ignored":   "The monster ignores your words and attacks!",
      "oni.not-surrendering": "The monster is not surrendering.",
      "oni.mercy":            "Oni-Baba smiles upon your mercy. Your spirit grows.",
      "oni.enter-domain":     "You enter the domain of Oni-Baba...",
      "oni.mood-shift":       "The Underworld trembles. Oni-Baba is now {mood}...",
      "oni.dragon-chaos":     "A black dragon's shadow falls across the temple vault. Level 7 awaits.",
      "oni.balance-return":   "A white naga's blessing kindles in the temple vault. Level 7 awaits.",
      "oni.anomaly":          "⚠ Oni-Baba detects instability: {code}",
      "oni.speech":           "🐉 \"{text}\"",
      "oni.room-flavour-0":   "The torches flicker as you enter.",
      "oni.room-flavour-1":   "Something watches from the shadows.",
      "oni.room-flavour-2":   "A cold wind carries whispers.",
      "oni.room-flavour-3":   "The stone here is darker, older.",
      "oni.room-flavour-4":   "Oni-Baba's presence intensifies.",
      "oni.room-flavour-5":   "Dust swirls at your feet.",
      "oni.room-flavour-6":   "The air smells of iron and incense.",
      "oni.room-flavour-7":   "An ancient ward hums underfoot.",
      // ── Combat / spell engine strings ─────────────────────────────────
      "gale.lift":            "🌪 GALE lifts <b>{name}</b> off the floor — twisting for {turns} turn{s}!",
      "gale.shrug":           "🌪 GALE rises but <b>{name}</b> shrugs off the wind!",
      "gale.no-target":       "🌪 GALE rises from the strike — roaring through the room!",
      "gale.sweep":           "🌪 GALE sweeps up <b>{name}</b> — twisting for {sec}s!",
      "gale.shoji-bust":      "🚪💨 GALE busts through the shoji — keeps roaring forward!",
      "gale.player-spin":     "🌪 The GALE catches you — spinning for {n} turn{s}!",
      "cyclone.shatter":      "🌪 CYCLONE tears the shoji apart — panels spiral away!",
    },
  },

  // ── Japanese (Modern / Furigana-friendly) ────────────────────────────────
  ja: {
    ui: {
      "enemy-label": "敵",
      "dist-unit": "m",
      "btn-wager": "賭ける",
      "btn-parley": "遊びに来た",
      "btn-hide": "隠れる",
      "btn-attack": "攻撃",
      "btn-retreat": "撤退",
      "btn-observe": "観察",
      "player-label": "勇者",
      "gold-label": "金",
      "xp-label": "経験値",
      "act-mode": "画面",
      "act-bag": "袋",
      "act-map": "地図",
      "act-settings": "設定",
      "act-rest": "休憩",
      "act-heal": "回復",
      "act-view": "視点",
      "act-log": "記録",
      "compass-n": "北",
      "compass-s": "南",
      "compass-e": "東",
      "compass-w": "西",
      "turn-player": "勇者のターン",
      "turn-monster": "敵のターン",
      "exit-title": "ダンジョンを出る？",
      "wager-bet-even": "偶数に賭ける",
      "wager-bet-odd": "奇数に賭ける",
      "wager-desc": "コインを倍増させる。",
      "wager-pays": "（1:1払い）",
      "chat-placeholder": "ここに入力...",
      "viewport-label": "視野",
    },
    cards: {
      boulder: { name: "岩石", desc: "重い衝撃。", attr: "(気絶 × 2ダイス)" },
      fissure: {
        name: "地割れ",
        desc: "大地を砕く。",
        attr: "(気絶 × 2ダイス)",
      },
      gale: {
        name: "暴風",
        desc: "強烈な突風。",
        attr: "(吹き飛ばし × 3ダイス)",
      },
      fireball: {
        name: "火球",
        desc: "業火の星。",
        attr: "(ダメージ × 4ダイス)",
      },
      pyroblast: {
        name: "炎爆発",
        desc: "巨大な炎ダメージ。",
        attr: "(ダメージ × 6ダイス)",
      },
      comet: {
        name: "彗星",
        desc: "上から降り注ぐ。",
        attr: "(ダメージ × 8ダイス)",
      },
      tide: {
        name: "大波",
        desc: "敵を押し流す。",
        attr: "(スロー × 3ダイス)",
      },
      surge: { name: "奔流", desc: "激しい波。", attr: "(ダメージ × 3ダイス)" },
      shuriken: {
        name: "手裏剣",
        desc: "遠距離攻撃。",
        attr: "(ダメージ × 2ダイス)",
      },
      short_bow: {
        name: "短弓",
        desc: "素早い矢。",
        attr: "(ダメージ × 2ダイス)",
      },
      long_bow: {
        name: "長弓",
        desc: "貫通射撃。",
        attr: "(ダメージ × 4ダイス)",
      },
      slash: {
        name: "斬撃",
        desc: "基本の斬り。",
        attr: "(ダメージ × 1ダイス)",
      },
      thrust: {
        name: "突き",
        desc: "素早い一突き。",
        attr: "(ダメージ × 1ダイス)",
      },
      strong_attack: {
        name: "強攻撃",
        desc: "重い一撃。",
        attr: "(ダメージ × 4ダイス, -25% 命中)",
      },
      heal_potion: { name: "回復薬", desc: "消耗品。", attr: "(HP + 20)" },
      potion: { name: "薬", desc: "消耗品。", attr: "(HP + 20)" },
      scroll_identity: {
        name: "鑑定の巻物",
        desc: "真実を明かす。",
        attr: "(鑑定)",
      },
      shield: { name: "盾", desc: "ACを上げる。", attr: "(AC + 5)" },
      samurai_helmet: { name: "武士の兜", desc: "+15 防御。", attr: "(装備)" },
      magic_lantern: {
        name: "魔法の灯篭",
        desc: "道を照らす。",
        attr: "(装備)",
      },
      wand_of_fireballs: {
        name: "火球の杖",
        desc: "バズーカ。",
        attr: "(ダメージ × 6ダイス)",
      },
      wand_of_magic_missiles: {
        name: "魔法弾の杖",
        desc: "9mmグロック。",
        attr: "(ダメージ × 3ダイス)",
      },
      tommy_gun: {
        name: "トミーガン",
        desc: "マフィアの火力。",
        attr: "(ダメージ × 8ダイス)",
      },
      gold_coin: { name: "金貨", desc: "富。", attr: "+50 ゴールド" },
      gold_coins: { name: "金貨", desc: "富。", attr: "+50 ゴールド" },
      pistol: { name: "魔法弾", desc: "秘術の飛び道具。", attr: "20-60 ダメージ" },
      dagger: { name: "短剣", desc: "素早い投げ。", attr: "10-25 ダメージ" },
      crossbow: { name: "弩", desc: "落ち着いた狙い。", attr: "21-42 ダメージ" },
      katana: { name: "刀", desc: "斬撃。", attr: "近接" },
      blade: { name: "刃", desc: "鋭い斬り。", attr: "近接" },
      hard_attack: { name: "強攻撃", desc: "重い一撃。", attr: "近接" },
      cyclone: { name: "旋風", desc: "追尾して回転。", attr: "3ダイス+23" },
      stamina_potion: { name: "気力薬", desc: "活力増強。", attr: "+10 気力" },
      scroll: { name: "巻物", desc: "秘術の頁。", attr: "装備" },
    },
    monsters: {
      yakuza_goblin:     "ヤクザゴブリン",
      yakuza_imp:        "ヤクザ小鬼",
      yakuza_supervisor: "ヤクザ階層監督",
      oni_baba:          "鬼婆、龍の姫",
    },
    log: {
      "monster-falls":        "⚔ <b>{name}</b>を倒した。",
      "monster-falls-fleeing":"💀 逃走中の<b>{name}</b>を討ち取った。",
      "monster-haunted-bonus": "👻 怨霊の怒りが体内に渦巻く。",
      "room-cleared":         "🗝 部屋を制圧。",
      "level-up":             "✨ <b>レベルアップ！</b> 現在レベル <b>{n}</b>。",
      "xp-gold":              "+{xp} 経験値 &nbsp;·&nbsp; +{gold} ゴールド",
      "loot-pickup":          "{item}を入手！",
      "auto-walk-engaged":    "⮕ オートウォーク開始。S/↓または行動で停止。",
      "auto-walk-stopped":    "⏹ オートウォーク停止 — 近くに敵！",
      "auto-walk-room":       "⏹ オートウォーク一時停止 — 新しい部屋。",
      "no-target":            "🎯 視界内に標的なし。",
      "target":               "🎯 標的: <b>{name}</b>",
      "auto-target":          "🎯 自動標的: <b>{name}</b>",
      "headshot":             "🎯 {name}に<b>ヘッドショット</b> — +{bonus} ボーナス。",
      // ── Oni-Baba event log strings (Japanese) ────────────────────────
      "oni.seal-passages":    "鬼婆が{n}つの通路を黒石で塞ぐ。",
      "oni.cruelty":          "残酷！鬼婆が降伏した敵への一撃を見ている。",
      "oni.hive-dodge":       "群体心が{atk}を予測！モンスターが回避！",
      "oni.surrender":        "モンスターは武器を捨て、命乞いをする！",
      "oni.retaliate":        "モンスターが反撃 — {dmg}ダメージ！",
      "oni.kill-witness":     "鬼婆がこの殺戮を見届けた。−1 業。",
      "oni.spirit-drifts":    "👻 {name}の魂が鬼婆へと漂う…",
      "oni.grudge-whisper":   "🕯 鬼婆がこの階の{n}体の身体に怨念を囁く。",
      "oni.parley-pleased":   "互いの心が通じた。鬼婆はそれを喜ぶ。",
      "oni.parley-ignored":   "モンスターは言葉を聞かず襲いかかる！",
      "oni.not-surrendering": "モンスターは降伏していない。",
      "oni.mercy":            "鬼婆があなたの慈悲に微笑む。魂が成長する。",
      "oni.enter-domain":     "鬼婆の領域に踏み入る…",
      "oni.mood-shift":       "冥界が震える。鬼婆の心は今、{mood}…",
      "oni.dragon-chaos":     "黒龍の影が神殿の地下室を覆う。第7階が待ち受ける。",
      "oni.balance-return":   "白蛇神の祝福が神殿の地下室に灯る。第7階が待ち受ける。",
      "oni.anomaly":          "⚠ 鬼婆が不安定を検知: {code}",
      "oni.speech":           "🐉 「{text}」",
      "oni.room-flavour-0":   "あなたが入ると松明が揺らめく。",
      "oni.room-flavour-1":   "影の中から何かが見つめている。",
      "oni.room-flavour-2":   "冷たい風が囁きを運んでくる。",
      "oni.room-flavour-3":   "ここの石はより暗く、古い。",
      "oni.room-flavour-4":   "鬼婆の気配が強まる。",
      "oni.room-flavour-5":   "足元に塵が舞う。",
      "oni.room-flavour-6":   "鉄と香の匂いが漂う。",
      "oni.room-flavour-7":   "古の結界が足元で唸る。",
      // ── Combat / spell engine strings (Japanese) ──────────────────────
      "gale.lift":            "🌪 暴風が<b>{name}</b>を地面から持ち上げる — {turns}ターン回転！",
      "gale.shrug":           "🌪 暴風が立ち上がるも<b>{name}</b>は風を払いのける！",
      "gale.no-target":       "🌪 一撃から暴風が立ち上がる — 部屋を吹き荒れる！",
      "gale.sweep":           "🌪 暴風が<b>{name}</b>を巻き上げる — {sec}秒間回転！",
      "gale.shoji-bust":      "🚪💨 暴風が障子を突き破る — 唸りを上げて進む！",
      "gale.player-spin":     "🌪 暴風があなたを捕まえる — {n}ターン回転！",
      "cyclone.shatter":      "🌪 旋風が障子を引き裂く — 紙片が螺旋を描いて飛ぶ！",
    },
  },
};

/**
 * Get a UI string for the current locale, falling back to 'en'.
 * @param {string} key
 * @param {string} [lang]
 */
window.t = function(key, lang) {
    const L = lang || window.currentLang || 'en';
    return (window.OrigamiI18n[L]?.ui[key]) ??
           (window.OrigamiI18n['en']?.ui[key]) ??
           key;
};

/**
 * Get a card locale object {name, desc, attr} for a card id.
 * Falls back to 'en', then to the card's own data.
 */
window.tCard = function(cardId, lang) {
    const L = lang || window.currentLang || 'en';
    return (window.OrigamiI18n[L]?.cards[cardId]) ??
           (window.OrigamiI18n['en']?.cards[cardId]) ??
           null;
};

/**
 * Look up a localized monster display name by id.
 *   tMonster('yakuza_goblin')   → 'Yakuza Goblin' / 'ヤクザゴブリン'
 *   tMonster('unknown')         → 'unknown' (passthrough)
 */
window.tMonster = function(monsterId, lang) {
    const L = lang || window.currentLang || 'en';
    return (window.OrigamiI18n[L]?.monsters?.[monsterId]) ??
           (window.OrigamiI18n['en']?.monsters?.[monsterId]) ??
           String(monsterId);
};

/**
 * Localized log fragment with {token} substitution.
 *   tLog('monster-falls', { name: 'Goblin' })
 *     → '⚔ <b>Goblin</b> is defeated.'
 *   tLog('level-up', { n: 3 })
 *     → '✨ LEVEL UP! You are now level 3.'
 * Missing keys fall back to 'en'; missing in both return the key itself
 * so the call site is recognisable in the log.
 */
window.tLog = function(key, params, lang) {
    const L = lang || window.currentLang || 'en';
    let tmpl = (window.OrigamiI18n[L]?.log?.[key]) ??
               (window.OrigamiI18n['en']?.log?.[key]) ??
               key;
    if (params){
        for (const [k, v] of Object.entries(params)){
            tmpl = tmpl.split('{' + k + '}').join(String(v));
        }
    }
    return tmpl;
};
