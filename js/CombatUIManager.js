class CombatUIManager {
  constructor() {
    this.overlay = document.getElementById('combat-ui-overlay');
    this.diceLayer = document.getElementById('dice-layer');
    // Cache els
    this.els = {
      gold: document.getElementById('cbt-gold-val'),
      wager: document.getElementById('cbt-wager-val'),
      monsterHp: document.getElementById('cbt-monster-hp'),
      hpBar: document.getElementById('cbt-hp-bar'),
      monsterAc: document.getElementById('cbt-ac'),
      monsterDist: document.getElementById('cbt-dist'),
      monsterState: document.getElementById('cbt-state'),
      slider: document.getElementById('bet-slider'),
      optEven: document.getElementById('opt-even'),
      optOdd: document.getElementById('opt-odd'),
      dices: [document.getElementById('d1'), document.getElementById('d2'), document.getElementById('d3')]
    };

    this.activeMonster = null;
    this.wager = 50;
    this.betEven = true;
    this.rolling = false;

    this.setupEvents();
    // Start hidden - managed by CSS now but keeping safety check
    if (this.overlay) this.overlay.style.display = 'none';
  }

  setupEvents() {
    if (document.getElementById('btn-attack')) document.getElementById('btn-attack').onclick = () => this.attack();
    if (document.getElementById('btn-retreat')) document.getElementById('btn-retreat').onclick = () => this.retreat();
    if (document.getElementById('btn-gamble')) document.getElementById('btn-gamble').onclick = () => this.gamble();
    if (document.getElementById('btn-wager-inc')) document.getElementById('btn-wager-inc').onclick = () => this.adjWager(10);
    if (document.getElementById('btn-wager-dec')) document.getElementById('btn-wager-dec').onclick = () => this.adjWager(-10);

    // New Buttons
    if (document.querySelector('.btn-selector')) document.querySelector('.btn-selector').onclick = () => this.showFloat("Basic Dice Only", "#fff");

    const negBtn = document.querySelectorAll('.game-btn.btn-blue')[0];
    if (negBtn) negBtn.onclick = () => this.negotiate();

    const rangedBtn = document.getElementById('btn-ranged') || document.querySelectorAll('.game-btn.btn-orange')[0];
    if (rangedBtn) rangedBtn.onclick = () => this.rangedAttack();

    const useItemBtn = document.querySelectorAll('.game-btn.btn-purple')[1];
    if (useItemBtn) useItemBtn.onclick = () => this.useSelectedItem();

    if (this.els.slider) this.els.slider.onclick = () => this.toggleBet();

    // Item Modal items
    window.selectItemType = (type, icon) => {
      this.selectedItem = type;
      document.getElementById('current-item-icon').innerText = icon;
      document.getElementById('item-modal').style.display = 'none';
    }
  }

  show(monster) {
    if (!monster) return;
    this.activeMonster = monster;
    if (this.overlay) this.overlay.style.display = 'flex';
    this.update();
  }

  hide() {
    if (this.overlay) this.overlay.style.display = 'none';
    this.activeMonster = null;
    window.combatMode = false;
    window.activeCombatMonster = null;
  }

  // WoW Style Floating Text with Physics
  showFloat(txt, col, isCrit = false) {
    const el = document.createElement('div');
    el.className = 'float-txt';
    el.innerText = txt;
    el.style.color = col;

    // Random start offset
    const startX = 50 + (Math.random() - 0.5) * 10;
    const startY = 40 + (Math.random() - 0.5) * 10;

    el.style.left = startX + '%';
    el.style.top = startY + '%';

    if (isCrit) {
      el.style.fontSize = '4.5rem';
      el.style.textShadow = '0 0 20px ' + col;
    }

    document.body.appendChild(el);

    // Physics Animation
    let x = 0;
    let y = 0;
    let vx = (Math.random() - 0.5) * 4; // Horizontal spread
    let vy = -6 - Math.random() * 4;   // Initial pop up
    let g = 0.5;                       // Gravity

    const anim = setInterval(() => {
      x += vx;
      y += vy;
      vy += g;

      el.style.transform = `translate(${x}px, ${y}px) scale(${isCrit ? 1.2 : 1.0})`;
      el.style.opacity = 1 - (y + 50) / 100; // Fade out as it falls

      if (y > 100) { // Off screen or done
        clearInterval(anim);
        el.remove();
      }
    }, 16);
  }

  useSelectedItem() {
    if (!this.selectedItem) {
      this.showFloat("Select an Item!", "#fff");
      return;
    }

    if (this.selectedItem === 'potion') {
      this.showFloat("+15 HP", "#4ade80");
      player.hp = Math.min(player.maxHp || 100, (player.hp || 50) + 15);
      // Visual heal effect?
    } else if (this.selectedItem === 'scroll') {
      this.showFloat("MANA SURGE!", "#3b82f6");
      // Add mana logic if exists
    } else if (this.selectedItem === 'bomb') {
      if (this.activeMonster) {
        this.showFloat("BOOM! -20", "#f97316", true);
        this.activeMonster.health -= 20;
        this.checkDeath();
      }
    }
    this.update();
  }

  negotiate() {
    if (!this.activeMonster) return;
    const roll = Math.random();
    if (roll > 0.6) {
      this.showFloat("PEACE!", "#4ade80");
      this.activeMonster.hostileState = 'NEUTRAL';
      this.activeMonster.state = 'IDLE';
      updateMonsterVisuals(this.activeMonster);
      setTimeout(() => this.hide(), 1000);
    } else {
      this.showFloat("REFUSED!", "#ef4444");
      // Free hit for monster
      this.monsterAttack();
    }
  }

  rangedAttack() {
    if (!this.activeMonster) return;
    // Calc distance
    const dist = Math.hypot(player.x - this.activeMonster.x, player.y - this.activeMonster.y);
    if (dist > 1.2) {
      this.showFloat("SNIPED! -8", "#fbbf24");
      this.activeMonster.health -= 8;
      this.checkDeath();
    } else {
      this.showFloat("Too Close!", "#94a3b8");
    }
  }

  monsterAttack() {
    this.showFloat("OUCH! -5", "#ef4444");
    player.hp = Math.max(0, (player.hp || 50) - 5);
    if (player.hp <= 0) {
      // Player death logic
      alert("YOU DIED");
      location.reload();
    }
    this.update();
  }

  adjWager(v) {
    if (this.rolling) return;
    const n = this.wager + v;
    if (n >= 10 && n <= (player.gold || 100)) {
      this.wager = n;
      if (this.els.wager) this.els.wager.innerText = this.wager;
    }
  }

  toggleBet() {
    if (this.rolling) return;
    this.betEven = !this.betEven;
    if (this.betEven) {
      this.els.slider.classList.remove('slide-right'); this.els.slider.classList.add('slide-left');
      this.els.optEven.classList.add('active-opt'); this.els.optOdd.classList.remove('active-opt');
    } else {
      this.els.slider.classList.remove('slide-left'); this.els.slider.classList.add('slide-right');
      this.els.optOdd.classList.add('active-opt'); this.els.optEven.classList.remove('active-opt');
    }
  }

  update() {
    if (!this.activeMonster || (this.overlay && this.overlay.style.display === 'none')) return;

    // Update Gold
    if (this.els.gold) this.els.gold.innerText = player.gold || 0;

    // Monster Stats
    if (this.els.monsterHp) this.els.monsterHp.innerText = `HP ${Math.ceil(this.activeMonster.health)}/20`; // Assuming 20 max for now
    if (this.els.monsterAc) this.els.monsterAc.textContent = `AC ${this.activeMonster.ac || 10}`;
    if (this.els.monsterDist) {
      const distMeters = Math.hypot(player.x - this.activeMonster.x, player.y - this.activeMonster.y);
      const distTiles = (distMeters / 5).toFixed(1);
      this.els.monsterDist.innerText = distTiles + " tiles";
    }
    if (this.els.monsterState) this.els.monsterState.innerText = this.activeMonster.hostileState;

    if (this.els.hpBar) {
      const pct = Math.max(0, (this.activeMonster.health / 20) * 100);
      this.els.hpBar.style.width = `${pct}%`;
    }
  }

  checkDeath() {
    if (this.activeMonster.health <= 0) {
      this.showFloat('VICTORY!', '#ffd700', true);
      // Kill monster logic
      if (window.removeMonster) window.removeMonster(this.activeMonster);
      else this.activeMonster.dead = true; // Fallback

      setTimeout(() => this.hide(), 1000);
    } else {
      this.update();
    }
  }

  attack() {
    if (!this.activeMonster) return;
    // Crit chance
    const isCrit = Math.random() > 0.8;
    const dmg = isCrit ? 8 : 4;
    const color = isCrit ? '#fbbf24' : '#ef4444'; // Gold for crit, Red for hit
    const text = isCrit ? `CRIT! -${dmg}` : `HIT! -${dmg}`;

    this.showFloat(text, color, isCrit);
    this.activeMonster.health -= dmg;
    this.checkDeath();
  }

  retreat() {
    this.showFloat('Retreating...', '#94a3b8');
    setTimeout(() => this.hide(), 500);
  }

  gamble() {
    if (this.rolling) return;
    if ((player.gold || 0) < this.wager) { alert("Not enough gold!"); return; }

    this.rolling = true;
    this.diceLayer.style.display = 'flex';
    player.gold = (player.gold || 0) - this.wager;
    this.update();

    this.els.dices.forEach(d => d.classList.add('dice-roll-anim'));

    setTimeout(() => {
      let total = 0;
      this.els.dices.forEach(d => {
        d.classList.remove('dice-roll-anim');
        const r = Math.floor(Math.random() * 6) + 1;
        total += r;
        const map = { 1: [0, 0], 2: [0, -90], 3: [0, 180], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };
        d.style.transform = `rotateX(${map[r][0]}deg) rotateY(${map[r][1]}deg)`;
      });

      setTimeout(() => {
        const isEven = total % 2 === 0;
        const win = (this.betEven && isEven) || (!this.betEven && !isEven);

        if (win) {
          player.gold += this.wager * 2;
          this.showFloat(`WIN! (${total})`, '#22c55e', true);

          // ALLY CONVERSION
          if (this.activeMonster) {
            this.showFloat('ALLY JOINED!', '#4ade80', true);
            this.activeMonster.isAlly = true;
            this.activeMonster.state = 'ALLY';
            this.activeMonster.hostileState = 'ALLY';
            updateMonsterVisuals(this.activeMonster); // Update to green circle
            setTimeout(() => this.hide(), 1500);
          }
        } else {
          this.showFloat(`LOST (${total})`, '#ef4444', true);
        }

        this.update();

        setTimeout(() => {
          this.diceLayer.style.display = 'none';
          this.els.dices.forEach(d => d.style.transform = 'none');
          this.rolling = false;
        }, 1000);
      }, 600);
    }, 800);
  }
}

// Instantiate Global Manager safely
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
         window.CombatUIManager = new CombatUIManager();
    });
} else {
    window.CombatUIManager = new CombatUIManager();
}

// Global Monster Removal (Combat Kill)
window.removeMonster = function (monster) {
  if (!monster || monster.dead) return;
  monster.dead = true;

  // 1. Remove from array
  if (typeof monsters !== 'undefined') {
    monsters = monsters.filter(m => m !== monster);
  }

  // 2. Hide object
  if (monster.object) monster.object.visible = false;

  // 3. Mark on floor
  if (typeof createDeadMonsterMark === 'function') {
    try {
      const result = createDeadMonsterMark(monster.x, monster.y);
      if (result) scene.add(result);
    } catch (e) { console.warn("Failed to create dead mark", e); }
  }

  // 4. Loot Drop (Floating at Eye Level)
  if (typeof generateLootForMonster === 'function') {
    try {
      const items = generateLootForMonster(monster);
      if (items && items.length > 0) {
        items.forEach((item, i) => {
          // Position: In front of player, floating
          const offsetDist = 2.0;
          // Calc position based on player facing
          const lx = player.object.position.x - Math.sin(player.object.rotation.y) * offsetDist;
          const lz = player.object.position.z - Math.cos(player.object.rotation.y) * offsetDist;

          // Slightly scatter if multiple
          const sx = (Math.random() - 0.5) * 0.5;

          const lootObj = createLootPileObject(item.visual || item.type, item.name || item.type);

          lootObj.position.set(lx + sx, 1.25, lz); // Eye/Chest level
          lootObj.lookAt(player.object.position); // Face player

          // Add userData
          lootObj.userData = { items: [item], lootIndex: i };

          // Add to scene
          addGameObject(`loot_float_${monster.id}_${i}_${Date.now()}`, lootObj);
        });
      }
    } catch (e) { console.warn("Loot generation failed", e); }
  }

  // 5. Cleanup interactions
  if (typeof endCombatCamera === 'function') endCombatCamera();
};
