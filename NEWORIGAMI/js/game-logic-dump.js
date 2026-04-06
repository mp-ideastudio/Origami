
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    

/* ---------- NEXT SCRIPT BLOCK ---------- */


      import * as THREE_BASE from 'three';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
      const THREE = { ...THREE_BASE, GLTFLoader };
      window.THREE = THREE;

          // --- DICTIONARY & PARSER ---
          const dictionary = {
              "movement": ["go", "move", "walk", "north", "south", "east", "west", "up", "down"],
              "interaction": ["take", "examine", "look", "use", "open", "search"],
              "combat": ["attack", "fight", "hit", "cast", "spell"],
              "inventory": ["i", "inventory", "items"],
          };

          async function parseCommand(command) {
              const lowerCmd = command.toLowerCase().trim();
              const words = lowerCmd.split(' ');
              let intent = null;
              let entities = [];
              const verb = words[0];
              for (const key in dictionary) {
                  if (dictionary[key].includes(verb)) { intent = key; break; }
              }
              if (verb === 'examine' || verb === 'look') intent = 'examine';
              if (verb === 'search') intent = 'search';
              if (dictionary.combat.includes(verb)) intent = 'attack';

              if (words.length > 1) {
                  const target = words.slice(1).join(' ');
                  if (intent === 'movement' && ['north', 'south', 'east', 'west', 'up', 'down'].includes(target)) {
                      entities.push({ entity: 'direction', value: target });
                  } else if (intent === 'examine') {
                      entities.push({ entity: 'object', value: target });
                  }
              }
              if (words.length === 1 && dictionary.movement.includes(words[0])) {
                  intent = 'movement';
                  entities.push({ entity: 'direction', value: words[0] });
              }
              return { intent, entities };
          }

          // --- SOUND MANAGER ---
          const sound = {
              isInitialized: false,
              synths: {},
              init() {
                  if (this.isInitialized || typeof Tone === 'undefined') return;
                  this.synths.item = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }, volume: -12 }).toDestination();
                  this.synths.puzzle = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 1.5, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }, volume: -8 }).toDestination();
                  this.synths.damage = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }, volume: -10 }).toDestination();
                  this.synths.solve = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 1 }, volume: -6 }).toDestination();
                  this.synths.hit = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 5, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -10 }).toDestination();
                  this.isInitialized = true;
              },
              play(type, note, duration = '8n') {
                  if (this.isInitialized && this.synths[type]) {
                      if (type === 'damage') {
                          this.synths[type].triggerAttackRelease("8n");
                      } else {
                          this.synths[type].triggerAttackRelease(note, duration);
                      }
                  }
              }
          };

          // --- FUZZY LOGIC CORE ---
          const fuzzyCore = {
              keywords: {
                  tree: { name: 'Ancient Tree', possibleEvents: ['heal', 'find_item'] },
                  lantern: { name: 'Stone Lantern', possibleEvents: ['find_puzzle_item', 'find_item'] },
                  chest: { name: 'Iron Chest', possibleEvents: ['find_item', 'damage', 'spawn_monster', 'riddle'] },
                  mirror: { name: 'Silver Mirror', possibleEvents: ['damage', 'sub_quest'] },
                  crystal: { name: 'Pulsing Crystal', possibleEvents: ['find_puzzle_item', 'heal'] },
                  sarcophagus: { name: 'Ornate Sarcophagus', possibleEvents: ['spawn_monster', 'find_puzzle_item'] },
                  fountain: { name: 'Ornate Fountain', possibleEvents: ['heal', 'damage'] },
                  statue: { name: 'Carved Statue', possibleEvents: ['find_puzzle_item', 'sub_quest', 'riddle'] },
                  book: { name: 'Dusty Book', possibleEvents: ['find_item', 'sub_quest', 'riddle'] }
              },
              events: {
                  heal: [{ type: 'heal', amount: 10, message: 'A soothing energy washes over you.' }],
                  damage: [{ type: 'damage', amount: 5, message: 'A sharp sting! You take damage.' }],
                  find_item: [
                      { type: 'find_item', itemType: 'gold', amount: 10, message: 'You found 10 gold coins!' },
                      { type: 'find_item', itemType: 'key', itemName: 'Crimson Key', message: 'You found a Crimson Key!' }
                  ],
                  find_puzzle_item: [{ type: 'find_puzzle_item', message: 'You discovered a Serpent Seal Fragment!' }],
                  spawn_monster: [
                      { type: 'spawn_monster', monsterName: 'Paper Shikigami', monsterHp: 30, monsterAttack: 3, message: 'A Paper Shikigami flutters out to attack!' },
                      { type: 'spawn_monster', monsterName: 'Vampire Origami Bat', monsterHp: 1, monsterAttack: 1, evasion: 0.75, message: 'A Vampire Origami Bat darts out from the shadows!' }
                  ],
                  sub_quest: [{ type: 'sub_quest', questId: 'findKey', message: "A faint inscription reads: 'The one who holds the Crimson Key may pass.'" }],
                  riddle: [{
                      type: 'riddle',
                      message: "A voice echoes: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?'",
                      answers: [
                          { text: 'A Map', correct: true, reward: { type: 'find_puzzle_item', message: 'Correct! A secret compartment opens, revealing a Serpent Seal Fragment!' } },
                          { text: 'A Dream', correct: false },
                          { text: 'A Book', correct: false }
                      ]
                  }]
              },
              getRandomEvent(type) {
                  const eventPool = this.events[type];
                  return {...eventPool[Math.floor(Math.random() * eventPool.length)]};
              }
          };

          // --- ROOM FACTORY ---
          class RoomFactory {
              constructor() { this.nextRoomId = 1; }
              _getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
              createRandomRoom(id) {
                  const room = { id: id, title: "Mysterious Chamber", exits: {}, items: [] };
                
                  room.description = "You are in a room. " + this._getRandomElement([
                      "The air is cold and damp.", "A strange silence fills the space.", 
                      "Flickering torchlight casts long shadows.", "The scent of old stone and dust hangs in the air."
                  ]);

                  const feature = this._getRandomElement(Object.keys(fuzzyCore.keywords));
                  room.description += ` You see a ${feature}.`;
                
                  for (const keyword in fuzzyCore.keywords) {
                      if (room.description.toLowerCase().includes(keyword)) {
                          const keywordData = fuzzyCore.keywords[keyword];
                          const eventType = this._getRandomElement(keywordData.possibleEvents);
                          const event = fuzzyCore.getRandomEvent(eventType);
                        
                          room.items.push({
                              keyword: keyword,
                              name: keywordData.name,
                              details: `You examine the ${keyword}.`,
                              interactionEvent: event
                          });
                      }
                  }
                  return room;
              }
          }
        
          const roomFactory = new RoomFactory();

          // --- GAME LOGIC ---
          const game = { 
              player: { hp: 100, maxHp: 100, currentLevel: 0, currentRoomId: 1, inventory: [], attackPower: 8, gold: 0, lastDirection: null }, 
              mapData: { levels: [] }, 
              puzzle: { required: 6, found: 0 },
              combat: { active: false, monsterName: null, monsterHp: 0, monsterMaxHp: 0, monsterAttack: 0, monsterEvasion: 0 },
              state: { inRiddle: false, selectedItem: null },
              ui: {} 
          };

          function initializeUI() {

              cacheUI();
              updatePlayerStats();
              setupEventListeners();
              regenerateDungeon();
          }
        
          function cacheUI() {
              const ids = ['adventureLog', 'commandInput', 'levelDisplay', 'progressCircle', 'levelNum', 'guideButtons', 'themeToggleBtn', 'inventoryBtn', 'redrawMapBtn', 'inventoryModal', 'inventoryPanel', 'inventoryGrid', 'goldCounter', 'characterModal', 'inventoryCloseBtn', 'inventoryCloseBtnBottom', 'useItemBtn', 'characterCloseBtn', 'combatModal', 'monsterName', 'monsterHealthBar', 'combatLog', 'playerCombatHp', 'combatAttackBtn'];
              ids.forEach(id => {
                  let kebabId = id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                  // Fixed: dnd-adventure-log doesn't match adventure-log kebab if we blindly prepend
                  if (id === 'adventureLog') kebabId = 'log';
                  
                  // Try adventure prefix first then game prefix
                  game.ui[id] = document.getElementById(`dnd-adventure-${kebabId}`) || document.getElementById(`dnd-game-${kebabId}`);
              });
          }

          function logEvent(message, type = 'normal') {
              const { adventureLog } = game.ui;
              if (!adventureLog) return;
              const p = document.createElement('p');
              if (type === 'command') p.style.opacity = '0.7';
              p.innerHTML = message;
              adventureLog.appendChild(p);
              adventureLog.scrollTop = adventureLog.scrollHeight;
          }

          function regenerateDungeon() {
              const { adventureLog } = game.ui;
              adventureLog.innerHTML = '';
              game.mapData.levels = [];
              game.player.currentLevel = 0;
              game.player.inventory = [];
              game.player.gold = 0;
              game.puzzle.found = 0;
              game.puzzle.required = 6;
              game.combat.active = false;
            
              generateLevel(0);
              game.player.currentRoomId = game.mapData.levels[0].keys().next().value;
            
              const initialMessage = `<h1 style="text-align:center; font-family: 'Yuji Syuku', serif; font-size: 1.7em; margin-bottom: 12px;"><b>Welcome to Origami Dungeon!</b></h1><p>You must enter the underworld to retrieve the <b>Golden Scroll of Destiny</b> from the powerful <b>Origami Serpent</b> and come back out to restore balance to the realm.</p><p><i>You continue walking down a long corridor and it opens up to a room...</i></p>`;
              logEvent(initialMessage);
              renderCurrentRoom();
          }

          function generateLevel(levelIndex, entryRoomId = null) {
              const levelSize = 10 + Math.floor(Math.random() * 6);
              const newLevel = new Map();
              let nextRoomId = (levelIndex * 100) + 1;

              for (let i = 0; i < levelSize; i++) {
                  newLevel.set(nextRoomId, roomFactory.createRandomRoom(nextRoomId));
                  nextRoomId++;
              }
            
              const rooms = Array.from(newLevel.values());
              for (let i = 0; i < rooms.length; i++) {
                  const currentRoom = rooms[i];
                  if (i < rooms.length - 1) {
                      const nextRoom = rooms[i+1];
                      const directions = ['north', 'south', 'east', 'west'];
                      const dir = roomFactory._getRandomElement(directions);
                      const oppositeDir = {north: 'south', south: 'north', east: 'west', west: 'east'};
                      currentRoom.exits[dir] = nextRoom.id;
                      nextRoom.exits[oppositeDir[dir]] = currentRoom.id;
                  }
              }

              const stairsDownRoom = roomFactory._getRandomElement(rooms.slice(Math.floor(levelSize / 2)));
              stairsDownRoom.items.push({ keyword: 'stairs', name: 'Stairs Down', details: 'A set of stairs leads deeper into the darkness.' });
              stairsDownRoom.exits.down = ((levelIndex + 1) * 100) + 1;

              if (entryRoomId) {
                  const stairsUpRoom = newLevel.get(entryRoomId);
                  stairsUpRoom.items.push({ keyword: 'stairs', name: 'Stairs Up', details: 'A set of stairs leads back the way you came.' });
                  stairsUpRoom.exits.up = game.mapData.levels[levelIndex - 1].values().next().value;
              }

              game.mapData.levels[levelIndex] = newLevel;
          }


          function renderCurrentRoom() {
              const currentLevelMap = game.mapData.levels[game.player.currentLevel];
              const currentRoom = currentLevelMap.get(game.player.currentRoomId);

              if (!currentRoom) {
                  logEvent("Error: You are lost in the void. Resetting...");
                  regenerateDungeon();
                  return;
              }
            
              let enrichedDescription = currentRoom.description;
              if (currentRoom.items) {
                  currentRoom.items.forEach(item => {
                      const regex = new RegExp(`\\b(${item.keyword})\\b`, 'gi');
                      enrichedDescription = enrichedDescription.replace(regex, `<span class="interactive-item" onclick="window.handleCommand('examine ${item.keyword}')" title="Examine ${item.keyword}">$1</span>`);
                  });
              }
              logEvent(`<hr><h3 style="text-align:center;">Room #${currentRoom.id} - ${currentRoom.title}</h3><p>${enrichedDescription}</p>`);
              updateGuideButtons(currentRoom);
          }
        
          function updateGuideButtons(currentRoom) {
              const { guideButtons } = game.ui;
              guideButtons.innerHTML = '';
              const createButton = (text, command, cssClass = '') => {
                  const btn = document.createElement('button');
                  btn.className = `dnd-game-guide-btn ${cssClass}`;
                  btn.textContent = text;
                  btn.dataset.command = command;
                  btn.onclick = () => handleCommand(command);
                  guideButtons.appendChild(btn);
              };

              if (game.combat.active || game.state.inRiddle) return;

              createButton('Search', 'search', 'search-btn');

              const oppositeDirection = {north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up'};
              const backDirection = oppositeDirection[game.player.lastDirection];
            
              if (backDirection && currentRoom.exits[backDirection]) {
                  createButton(`Go ${backDirection.charAt(0).toUpperCase() + backDirection.slice(1)}`, `go ${backDirection}`, 'traveled-btn');
              }

              if (currentRoom.items) currentRoom.items.forEach(item => {
                  if (item.interactionEvent || item.keyword === 'stairs') {
                      createButton(`Examine ${item.name}`, `examine ${item.keyword}`);
                  }
              });
              if (currentRoom.exits) {
                  Object.entries(currentRoom.exits).forEach(([direction]) => {
                      if (direction !== backDirection) {
                          createButton(`Go ${direction.charAt(0).toUpperCase() + direction.slice(1)}`, `go ${direction}`);
                      }
                  });
              }
          }
        
          function checkPuzzleCompletion() {
              if (game.puzzle.found >= game.puzzle.required) {
                  const startRoom = game.mapData.levels[0].get(game.mapData.startRoomId);
                  if (!startRoom.exits['down']) {
                      sound.play('solve', ['C4', 'E4', 'G4'], '1n');
                      logEvent(`<hr><b class="puzzle-item-text">The Serpent Seal Fragments resonate, shattering the barrier where your journey began! A dark passage to the Serpent's Lair has opened.</b><hr>`);
                      startRoom.exits['down'] = 1000;
                    
                      const bossRoom = { 
                          id: 1000, 
                          title: "Origami Serpent's Lair", 
                          description: "You descend into a cavern reeking of sulfur and malice. In the center coils the horrifying Origami Serpent, guarding the Golden Scroll of Destiny.", 
                          items: [{
                              keyword: 'monster',
                              name: 'Origami Serpent',
                              details: 'It is a terrifying fusion of demon and paper, its scales shimmering with dark energy.',
                              interactionEvent: { type: 'spawn_monster', monsterName: 'Origami Serpent', monsterHp: 80, monsterAttack: 10, message: 'The Origami Serpent lets out a deafening hiss and lunges to attack!' }
                          }], 
                          exits: { 'up': game.mapData.startRoomId } 
                      };
                      game.mapData.levels[game.player.currentLevel].set(1000, bossRoom);
                    
                      if(game.player.currentRoomId === game.mapData.startRoomId) updateGuideButtons(startRoom);
                  }
              }
          }

          function handleInteractionEvent(event, item, command) {
              if (event && event.message) logEvent(`<i>${event.message}</i>`);

              const buttonToRemove = document.querySelector(`[data-command="${command}"]`);
              if (buttonToRemove) buttonToRemove.remove();

              switch (event.type) {
                  case 'find_item':
                      if (event.itemType === 'gold') {
                          game.player.gold += event.amount;
                      } else {
                          game.player.inventory.push(event.itemName);
                      }
                      logEvent(`<b>[${event.itemName || `${event.amount} gold`} added to inventory.]</b>`);
                      sound.play('item', 'C5');
                      break;
                  case 'find_puzzle_item':
                      game.puzzle.found++;
                      game.player.inventory.push('Serpent Seal Fragment');
                      logEvent(`<b>[Serpent Seal Fragment found! (${game.puzzle.found}/${game.puzzle.required})]</b>`);
                      sound.play('puzzle', 'G5', '4n');
                      checkPuzzleCompletion();
                      break;
                  case 'damage':
                      game.player.hp = Math.max(0, game.player.hp - event.amount);
                      updatePlayerStats();
                      sound.play('damage');
                      break;
                  case 'heal':
                      game.player.hp = Math.min(game.player.maxHp, game.player.hp + event.amount);
                      updatePlayerStats();
                      sound.play('item', 'E5');
                      break;
                  case 'reveal_exit':
                      const currentRoom = game.mapData.levels[game.player.currentLevel].get(game.player.currentRoomId);
                      if (!currentRoom.exits[event.direction]) {
                          currentRoom.exits[event.direction] = event.roomId;
                          updateGuideButtons(currentRoom);
                      }
                      break;
                  case 'spawn_monster':
                      game.combat.active = true;
                      game.combat.monsterName = event.monsterName;
                      game.combat.monsterHp = event.monsterHp;
                      game.combat.monsterMaxHp = event.monsterHp;
                      game.combat.monsterAttack = event.monsterAttack;
                      logEvent(`<b class="combat-text">A wild ${event.monsterName} appears! (HP: ${event.monsterHp})</b>`);
                      sound.play('damage', 'C3', '2n');
                      updateGuideButtons(game.mapData.levels[game.player.currentLevel].get(game.player.currentRoomId));
                      break;
                  case 'sub_quest':
                      logEvent(`<b class="puzzle-item-text">[New Quest Started!]</b> ${event.message}`);
                      break;
                  case 'riddle':
                      game.state.inRiddle = true;
                      game.ui.guideButtons.innerHTML = '';
                      event.answers.forEach(answer => {
                          const btn = document.createElement('button');
                          btn.className = 'dnd-game-guide-btn riddle-answer-btn';
                          btn.textContent = answer.text;
                          btn.onclick = () => handleRiddleAnswer(answer);
                          game.ui.guideButtons.appendChild(btn);
                      });
                      break;
              }
              delete item.interactionEvent;
          }

          function handleRiddleAnswer(answer) {
              game.state.inRiddle = false;
              if (answer.correct) {
                  logEvent(`<i>'Correct,' the voice echoes.</i>`);
                  handleInteractionEvent(answer.reward, {});
              } else {
                  logEvent(`<i>'Wrong,' the voice booms. A wave of force pushes you back.</i>`);
                  handleInteractionEvent({type: 'damage', amount: 3, message: 'The incorrect answer jolts you!'}, {});
              }
              updateGuideButtons(game.mapData.levels[game.player.currentLevel].get(game.player.currentRoomId));
          }

          async function handleSearch() {
              const currentRoom = game.mapData.levels[game.player.currentLevel].get(game.player.currentRoomId);
              const exits = Object.keys(currentRoom.exits);
              let searchMessage = '<i>Searching';
              const p = document.createElement('p');
              p.innerHTML = searchMessage + '</i>';
              game.ui.adventureLog.appendChild(p);
              const delay = (ms) => new Promise(res => setTimeout(res, ms));
              for (let i = 0; i < exits.length; i++) {
                  await delay(400);
                  searchMessage += '.';
                  p.innerHTML = searchMessage + '</i>';
                  game.ui.adventureLog.scrollTop = game.ui.adventureLog.scrollHeight;
              }
              await delay(200);
              p.innerHTML += exits.length > 0 ? `<br>You get a sense of passages in ${exits.length} direction(s).` : `<br>You feel closed in. There are no obvious exits.`;
              game.ui.adventureLog.scrollTop = game.ui.adventureLog.scrollHeight;
          }

          async function handleCommand(command) {
              if (!command) return;
              sound.init();
              logEvent(`> ${command}`, 'command');
              game.ui.commandInput.value = '';

              const { intent, entities } = await parseCommand(command);
              const currentRoom = game.mapData.levels[game.player.currentLevel].get(game.player.currentRoomId);

              if (game.combat.active && intent !== 'attack') {
                  logEvent("You can't do that right now, you're in combat!");
                  return;
              }

              switch (intent) {
                  case 'movement':
                      const direction = entities[0]?.value;
                      if (direction && currentRoom.exits[direction]) {
                          game.player.lastDirection = direction;
                          if (direction === 'down') {
                              game.player.currentLevel++;
                              if (!game.mapData.levels[game.player.currentLevel]) {
                                  generateLevel(game.player.currentLevel, currentRoom.exits.down);
                              }
                              game.player.currentRoomId = currentRoom.exits.down;
                          } else if (direction === 'up') {
                              game.player.currentLevel--;
                              game.player.currentRoomId = currentRoom.exits.up;
                          } else {
                              game.player.currentRoomId = currentRoom.exits[direction];
                          }
                          renderCurrentRoom();
                      } else { logEvent("You can't go that way."); }
                      break;
                  case 'examine':
                      const objectKeyword = entities[0]?.value;
                      const item = currentRoom.items?.find(i => i.keyword === objectKeyword);
                      if (item) {
                          logEvent(item.details);
                          if (item.interactionEvent) handleInteractionEvent(item.interactionEvent, item, command);
                      } else { logEvent("You don't see that here."); }
                      break;
                  case 'search': handleSearch(); break;
                  case 'inventory': toggleInventory(); break;
                  case 'attack':
                      if (!game.combat.active) { logEvent("There's nothing to attack."); break; }
                      const playerDamage = game.player.attackPower;
                      game.combat.monsterHp = Math.max(0, game.combat.monsterHp - playerDamage);
                      sound.play('hit', 'C3');
                      logEvent(`You strike the ${game.combat.monsterName} for <b class="combat-text">${playerDamage}</b> damage. It has ${game.combat.monsterHp} HP left.`);
                    
                      if (game.combat.monsterHp <= 0) {
                          logEvent(`You have defeated the ${game.combat.monsterName}!`);
                          if(game.combat.monsterName === 'Origami Serpent') {
                              logEvent(`<hr><b class="puzzle-item-text">With a final, agonized scream, the serpent monster dissolves into shadow. You retrieve the Golden Scroll of Destiny! Balance is restored to the kingdom! YOU ARE VICTORIOUS!</b><hr>`);
                              game.player.inventory.push('Golden Scroll of Destiny');
                              game.combat.active = false;
                              game.ui.guideButtons.innerHTML = '';
                          } else {
                              game.combat.active = false;
                              sound.play('solve', 'C5', '4n');
                              updateGuideButtons(currentRoom);
                          }
                          break;
                      }
                    
                      const monsterDamage = game.combat.monsterAttack;
                      game.player.hp = Math.max(0, game.player.hp - monsterDamage);
                      sound.play('damage');
                      logEvent(`The ${game.combat.monsterName} hits you for <b class="combat-text">${monsterDamage}</b> damage.`);
                      updatePlayerStats();

                      if (game.player.hp <= 0) {
                          logEvent("You have been defeated... Your journey ends here.");
                          game.ui.guideButtons.innerHTML = '';
                      }
                      break;
                  case 'help':
                      logEvent("<b>Commands:</b><br><b>go [direction]</b><br><b>examine [item]</b><br><b>search</b>, <b>inventory</b> (or i), <b>attack</b>");
                      break;
                  default: logEvent("I don't understand that command."); break;
              }
          }

          function updatePlayerStats() {
              const { levelNum, progressCircle } = game.ui;
              if (levelNum) {
                  levelNum.textContent = String(game.player.currentLevel + 1).padStart(2, '0');
              }
              const hpPercent = game.player.hp / game.player.maxHp;
              const radius = 21;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference * (1 - hpPercent);
              if (progressCircle) {
                  progressCircle.innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="${radius}" fill="none" stroke="var(--damage-red)" stroke-width="5" /><circle cx="24" cy="24" r="${radius}" fill="none" stroke="var(--success-green)" stroke-width="5" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" transform="rotate(-90 24 24)" style="transition: stroke-dashoffset 0.5s, stroke 0.3s;" /></svg>`;
              }
          }
        
          function toggleTheme() {
              document.body.classList.toggle('dark-mode');
          }

          function toggleInventory() {
              const { inventoryModal } = game.ui;
              const isVisible = inventoryModal.style.display === 'flex';
              if (isVisible) {
                  inventoryModal.style.display = 'none';
              } else {
                  renderInventory();
                  inventoryModal.style.display = 'flex';
              }
          }

          function renderInventory() {
              const { inventoryGrid, goldCounter } = game.ui;
              inventoryGrid.innerHTML = '';
              goldCounter.innerHTML = `🪙 ${game.player.gold}`;
              const itemEmojis = { 'Serpent Seal Fragment': '📜', 'Golden Scroll of Destiny': '✨', 'Crimson Key': '🔑' };
              const inventorySize = 12;
              for (let i = 0; i < inventorySize; i++) {
                  const slot = document.createElement('div');
                  slot.className = 'inventory-slot';
                  if (game.player.inventory[i]) {
                      slot.textContent = itemEmojis[game.player.inventory[i]] || game.player.inventory[i];
                      slot.title = game.player.inventory[i];
                  }
                  inventoryGrid.appendChild(slot);
              }
          }

          function toggleCharacterPanel() {
              const { characterModal } = game.ui;
              const isVisible = characterModal.style.display === 'flex';
              if (isVisible) {
                  characterModal.style.display = 'none';
              } else {
                  renderCharacterPanel();
                  characterModal.style.display = 'flex';
              }
          }

          function renderCharacterPanel() {
              document.getElementById('dnd-game-armor-slot').textContent = '👕';
              document.getElementById('dnd-game-ring-slot-1').textContent = '💍';
              document.getElementById('dnd-game-ring-slot-2').textContent = '💍';
              document.getElementById('dnd-game-shoes-slot').textContent = '👟';
          }

          function setupEventListeners() {
              if (game.ui.commandInput) {
                  game.ui.commandInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCommand(e.target.value); });
              }
              if (game.ui.themeToggleBtn) game.ui.themeToggleBtn.addEventListener('click', toggleTheme);
              if (game.ui.redrawMapBtn) game.ui.redrawMapBtn.addEventListener('click', regenerateDungeon);
              if (game.ui.inventoryBtn) game.ui.inventoryBtn.addEventListener('click', toggleInventory);
              if (game.ui.levelDisplay) game.ui.levelDisplay.addEventListener('click', toggleCharacterPanel);
              if (game.ui.inventoryModal) game.ui.inventoryModal.addEventListener('click', (e) => { if (e.target === game.ui.inventoryModal) toggleInventory(); });
              if (game.ui.characterModal) game.ui.characterModal.addEventListener('click', (e) => { if (e.target === game.ui.characterModal) toggleCharacterPanel(); });
              if (game.ui.inventoryCloseBtn) game.ui.inventoryCloseBtn.addEventListener('click', toggleInventory);
              if (game.ui.inventoryCloseBtnBottom) game.ui.inventoryCloseBtnBottom.addEventListener('click', toggleInventory);
              if (game.ui.characterCloseBtn) game.ui.characterCloseBtn.addEventListener('click', toggleCharacterPanel);
          }

          // Make core UI functions globally accessible for inline onclick and external listeners
          window.handleCommand = handleCommand;
          window.initializeUI = initializeUI;
          window.regenerateDungeon = regenerateDungeon;
          window.toggleInventory = toggleInventory;
          window.toggleCharacterPanel = toggleCharacterPanel;


      // --- Basic Setup ---
      const scene = window.scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.025); // Black fog for empty spaces

      const mapContainer = document.getElementById("mapview-container");
      const mapCanvasWrapper = mapContainer.querySelector(".canvas-wrapper");

      // Debug: Check if containers exist
      console.log("Container check:", {
        mapContainer: !!mapContainer,
        mapCanvasWrapper: !!mapCanvasWrapper,
        mapContainerDisplay: mapContainer ? getComputedStyle(mapContainer).display : 'not found',
        mapContainerVisibility: mapContainer ? getComputedStyle(mapContainer).visibility : 'not found'
      });

      // Debug: Check initial dimensions
      console.log("Map Canvas Wrapper dimensions:", {
        clientWidth: mapCanvasWrapper.clientWidth,
        clientHeight: mapCanvasWrapper.clientHeight,
        offsetWidth: mapCanvasWrapper.offsetWidth,
        offsetHeight: mapCanvasWrapper.offsetHeight,
      });

      // Fallback for zero dimensions - use container size
      let canvasWidth =
        mapCanvasWrapper.clientWidth || mapContainer.clientWidth || 400;
      let canvasHeight =
        mapCanvasWrapper.clientHeight || mapContainer.clientHeight || 300;

      console.log("Using canvas dimensions:", { canvasWidth, canvasHeight });

      const camera = window.camera = new THREE.PerspectiveCamera(
        75,
        canvasWidth / canvasHeight,
        0.1,
        1000
      );
      const renderer = window.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(canvasWidth, canvasHeight, false);

      // Debug: Check renderer dimensions
      console.log("Renderer dimensions:", {
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        style: {
          width: renderer.domElement.style.width,
          height: renderer.domElement.style.height,
        },
      });

      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35; // Enhanced for more dramatic lighting
  renderer.setClearColor(0x2a2a2a, 1); // Dark gray background for any off-map area in map view
      // mapCanvasWrapper.appendChild(renderer.domElement); // MOVED TO init()


      const fpvViewContainer = document.getElementById("fpv-viewport");
      
      // Debug: Check FPV container
      console.log("FPV Container check:", {
        fpvViewContainer: !!fpvViewContainer,
        fpvDisplay: fpvViewContainer ? getComputedStyle(fpvViewContainer).display : 'not found',
        fpvVisibility: fpvViewContainer ? getComputedStyle(fpvViewContainer).visibility : 'not found',
        fpvDimensions: fpvViewContainer ? {
          clientWidth: fpvViewContainer.clientWidth,
          clientHeight: fpvViewContainer.clientHeight
        } : 'not found'
      });
      
      const fpvCamera = window.fpvCamera = new THREE.PerspectiveCamera(
        60,
        fpvViewContainer.clientWidth / fpvViewContainer.clientHeight,
        0.1,
        100
      );
      const fpvRenderer = window.fpvRenderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      fpvRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      fpvRenderer.setSize(
        fpvViewContainer.clientWidth,
        fpvViewContainer.clientHeight,
        false
      );
      fpvRenderer.shadowMap.enabled = true;
      fpvRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      fpvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      fpvRenderer.toneMappingExposure = 1.15; // Enhanced for FPV cinematic feel
  fpvRenderer.setClearColor(0x2a2a2a, 1); // Dark gray background for empty spaces
      // fpvViewContainer.appendChild(fpvRenderer.domElement); // MOVED TO init()


      // --- Lighting ---
      // Cinematic lighting: cooler sky, warmer key, subtle rim
      const hemisphereLight = new THREE.HemisphereLight(
        0x88aaff,
        0x202228,
        0.42 // Reduced by 30% from 0.6
      );
      scene.add(hemisphereLight);
      // Warm key directional light for depth and shadows
      const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.665); // Reduced by 30% from 0.95
      dirLight.position.set(30, 60, 10);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      const d = 100;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 300;
      dirLight.shadow.bias = -0.001; // Improved shadow bias
      dirLight.shadow.normalBias = 0.02; // Add normal bias for cleaner shadows
      scene.add(dirLight);
      // Cool rim light from behind for silhouette separation (FPV-focused)
      let rimLight = new THREE.DirectionalLight(0x99bbff, 0.245); // Reduced by 30% from 0.35
      rimLight.position.set(-20, 40, -30);
      rimLight.castShadow = false;
      scene.add(rimLight);
      
      // Map view brightness boost lights (layer 0 only)
      const mapAmbientBoost = new THREE.HemisphereLight(
        0xcce6ff, // Brighter sky
        0x666666, // Slightly brighter ground
        0.9       // Stronger boost for map visibility
      );
      mapAmbientBoost.layers.set(0); // Map view only
      scene.add(mapAmbientBoost);
      
  const mapDirectionalBoost = new THREE.DirectionalLight(0xfff0d8, 1.2);
      mapDirectionalBoost.position.set(10, 80, 20);
      // Enable shadows for the map view to create cinematic effect
      mapDirectionalBoost.castShadow = true; 
      mapDirectionalBoost.shadow.mapSize.width = 2048;
      mapDirectionalBoost.shadow.mapSize.height = 2048;
      mapDirectionalBoost.shadow.camera.near = 1;
      mapDirectionalBoost.shadow.camera.far = 300;
      mapDirectionalBoost.shadow.bias = -0.0005;
      mapDirectionalBoost.shadow.radius = 2; // Softer shadow edges
      mapDirectionalBoost.layers.set(0); // Map view only
      scene.add(mapDirectionalBoost);
      
      // Additional flat ambient for map view only to ensure no dark tiles
      const mapFlatAmbient = new THREE.AmbientLight(0xffffff, 1.2);
      mapFlatAmbient.layers.set(0);
      scene.add(mapFlatAmbient);
      
      // Subtle cool rim-like accent for map layer to echo FPV silhouette separation
      const mapCoolRim = new THREE.DirectionalLight(0x99bbff, 0.08);
      mapCoolRim.position.set(-20, 40, -30);
      mapCoolRim.castShadow = false;
      mapCoolRim.layers.set(0); // Map view only
      scene.add(mapCoolRim);
      
      // Add dramatic side light for cinematic shadow casting in map view
      const mapDramaticSideLight = new THREE.DirectionalLight(0xff9933, 0.4);
      mapDramaticSideLight.position.set(-30, 40, 30);
      mapDramaticSideLight.castShadow = true;
      mapDramaticSideLight.shadow.mapSize.width = 1024;
      mapDramaticSideLight.shadow.mapSize.height = 1024;
      mapDramaticSideLight.shadow.camera.near = 1;
      mapDramaticSideLight.shadow.camera.far = 200;
      mapDramaticSideLight.shadow.bias = -0.0008;
      mapDramaticSideLight.shadow.radius = 1.5;
      mapDramaticSideLight.layers.set(0); // Map view only
      scene.add(mapDramaticSideLight);
      
      let playerLight;

      // --- Game Constants & Layers ---
      const TILE_SIZE = 5;
      const MAP_WIDTH = 50;
      const MAP_HEIGHT = 50;
      const PLAYER_ANIMATION_SPEED = 0.4;
  const TILE = { WALL: "#", FLOOR: "." };
      const FPV_MODEL_LAYER = 1;
      // Limit rim light to FPV so the tactical map stays clean
      if (typeof rimLight !== "undefined" && rimLight)
        rimLight.layers.set(FPV_MODEL_LAYER);
      // Room discovery layer for overlays
      const ROOM_OVERLAY_LAYER = 2;

      // Asset manifest for models (player model removed temporarily)
      const models = [
        { name: "imp", url: "https://markpeterson.info/assets/Yakuza.Imp.glb" },
        {
          name: "goblin",
          url: "https://markpeterson.info/assets/Yakuza.Goblin.2.glb",
        },
      ];

      // Centralized tuning knobs (safe, non-breaking defaults)
      const TUNING = {
        lighting: {
          playerFill: {
            color: 0xffddaa,
            intensity: 0.4, // Much darker FPV (was 0.7, now 0.4)
            distance: TILE_SIZE * 6.5, // Slightly increased reach
            decay: 2.0, // Softer falloff for cinematic look
          },
          headlamp: {
            color: 0xfff8e0,
            intensity: 0.5, // Much darker FPV (was 0.8, now 0.5)
            distance: TILE_SIZE * 14, // Increased reach
            angle: Math.PI / 6.8, // Slightly wider cone
            penumbra: 0.45, // Softer edges
            decay: 1.1, // Gentler falloff
          },
          monsterFlashlight: {
            color: 0xff6666, // More ominous red tint
            intensity: 0.9, // Much darker FPV (was 1.4, now 0.9)
            distance: TILE_SIZE * 8,
            angle: Math.PI / 6.2,
            penumbra: 0.4,
            decay: 1.25,
          },
          monsterOrb: {
            color: 0x4488ff, // Cooler blue
            intensity: 0.25, // Much darker FPV (was 0.45, now 0.25)
            distance: TILE_SIZE * 6,
            decay: 2.2, // Softer falloff
          },
          flashlight: {
            color: 0xffffff, // Pure white beam
            intensity: 0.9, // Much darker FPV (was 1.5, now 0.9)
            distance: TILE_SIZE * 20, // Long reach
            angle: Math.PI / 8, // Narrow focused beam
            penumbra: 0.2, // Sharp edges
            decay: 0.8, // Minimal falloff for long range
          },
        },
        map: {
          // Camera pitch in degrees (higher = more top-down, fewer walls occluding)
          pitchDeg: 85, // Much more overhead view (was 68, now 85 for nearly top-down)
        },
        combat: {
          detection: {
            frontCone: Math.PI / 6,
            frontDist: 15,
            sideCone: Math.PI / 2,
            sideDist: 4,
            rearCone: Math.PI * 0.9,
            rearDist: 2,
          },
          facingPrecision: Math.PI / 8,
          // Combat camera settings
          camera: {
            heightOffset: 0.9, // Additional 3 feet up (0.9 units = 3 feet)
            tiltDownAngle: Math.PI / 6, // 30 degrees down
            transitionDuration: 500, // milliseconds
          }
        },
        movement: {
          fpvCameraOffset: { x: 0, y: 1.8, z: TILE_SIZE }, // 1 tile behind (Z=TILE_SIZE), 1 foot above head (Y=1.8)
        },
        models: {
          playerHeight: 1.8, // 6 feet tall (increased from 1.5)
          monsterHeight: 1.2, // 4 feet tall (increased from 0.9)
          monsterHeightFPV: 1.2, // Keep same as map view for consistency (was 1.5)
          mapViewScale: 3.0, // 50% larger than previous (was 2.0, now 3.0 for 150% total)
          fpvViewScale: 1.8, // 10% smaller than previous map scale (was 2.0, now 1.8 for 90% of original map scale)
          yaw: { 
            player: 0, 
            monster: -Math.PI / 2, // General monster yaw
            yakuzaImp: 0 // Yakuza.imp facing forward (fixed from -Math.PI backwards orientation)
          },
        },
      };

      // Small helper: scale a model to target height and ground it
      function fitToHeightAndGround(
        object3D,
        targetHeight = 1.2,
        yOffset = 0.02
      ) {
        try {
          // Use the largest axis as height to handle models with Z-up or unusual poses
          const box = new THREE.Box3().setFromObject(object3D);
          const dx = Math.max(0, box.max.x - box.min.x);
          const dy = Math.max(0, box.max.y - box.min.y);
          const dz = Math.max(0, box.max.z - box.min.z);
          const extent = Math.max(dx, dy, dz, 0.0001);
          const scale = targetHeight / extent;
          object3D.scale.setScalar(scale);
          const box2 = new THREE.Box3().setFromObject(object3D);
          const minY = box2.min.y;
          object3D.position.y += -minY + yOffset;
          return scale;
        } catch (_) {
          return 1;
        }
      }

      // Light re-tuning helpers
      function applyHeadlampTuning(light) {
        if (!light) return;
        const c = TUNING.lighting.headlamp;
        light.color.setHex(c.color);
        light.intensity = c.intensity;
        light.distance = c.distance;
        light.angle = c.angle;
        light.penumbra = c.penumbra;
        light.decay = c.decay;
      }
      function applyPlayerFillTuning(light) {
        if (!light) return;
        const c = TUNING.lighting.playerFill;
        light.color.setHex(c.color);
        light.intensity = c.intensity;
        light.distance = c.distance;
        light.decay = c.decay;
      }
      function applyMonsterFlashlightTuning(light) {
        if (!light) return;
        const c = TUNING.lighting.monsterFlashlight;
        light.color.setHex(c.color);
        light.intensity = c.intensity;
        light.distance = c.distance;
        light.angle = c.angle;
        light.penumbra = c.penumbra;
        light.decay = c.decay;
      }
      function applyMonsterOrbTuning(light) {
        if (!light) return;
        const c = TUNING.lighting.monsterOrb;
        light.color.setHex(c.color);
        light.intensity = c.intensity;
        light.distance = c.distance;
        light.decay = c.decay;
      }
      function applyFlashlightTuning(light) {
        if (!light) return;
        const c = TUNING.lighting.flashlight;
        light.color.setHex(c.color);
        light.intensity = c.intensity;
        light.distance = c.distance;
        light.angle = c.angle;
        light.penumbra = c.penumbra;
        light.decay = c.decay;
      }

  // --- Game State & Core Engine ---
  const MONSTER_AI_DISABLED = false; // Enable monsters
  
  // 🐉 Monster AI States and Configuration
  const MONSTER_STATES = Object.freeze({
    IDLE: 'IDLE',
    HOSTILE: 'HOSTILE',
    SEARCHING: 'SEARCHING',
    ALLY: 'ALLY',
    GAMING: 'GAMING'
  });

  const PLAYER_SPEED_UNITS = 100;
  const MONSTER_BASE_SPEED_UNITS = 75;
  const MONSTER_SPEED_RATIO = MONSTER_BASE_SPEED_UNITS / PLAYER_SPEED_UNITS;

  const MONSTER_AI_CONFIG = Object.freeze({
    LOS_MAX_RANGE: 14,
    FIELD_OF_VIEW: Math.PI / 3,
    SPEED_RATIO: MONSTER_SPEED_RATIO,
    SEARCH_SPEED_RATIO: MONSTER_SPEED_RATIO,
    SEARCH_DURATION_TURNS: 6,
    BLINK_INTERVAL_MS: 220,
    BLINK_CYCLES: 4,
    VISION_FRONT_RANGE: 14,
    VISION_SIDE_RANGE: 10,
    HEARING_RANGE: 0,
    DETECTION_ANGLES: {
      FRONT: Math.PI / 3,
      SIDE: Math.PI / 2
    },
    SPEEDS: {
      SAME_ROOM: MONSTER_SPEED_RATIO,
      OUTSIDE_ROOM: MONSTER_SPEED_RATIO,
      SEARCHING: MONSTER_SPEED_RATIO
    },
    SEARCH_TURNS: 6
  });

  // 🎵 Monster alert sound
  const GOBLIN_ALERT_SOUND_URL = 'https://gfxsounds.com/wp-content/uploads/2021/02/Goblin-attack-quick.mp3';
  let map = [];
  const player = window.player = {
          x: 0,
          y: 0,
          currentTile: null, // Track current tile for NetHack-style visibility
          // NetHack-like core attributes
          level: 1,
          exp: 0,
          expToLevel: () => 10 * Math.pow(player.level, 2), // Scaled XP curve
          str: 10,
          dex: 10,
          con: 10,
          intel: 10,
          wis: 10,
          cha: 10,
          health: 10,
          maxHealth: 10,
          attack: 1,
          ac: 10, // Armor Class (NetHack style)
          inventory: [],
          equipment: { 
            weapon: null, 
            armor: null, 
            helmet: null,
            boots: null,
            gauntlets: null,
            ring: null, 
            amulet: null 
          },
          skills: {},
          gold: 0,
          object: null,
          rotationY: 0,
          hasKey: false,
          wasHit: false,
          kills: 0,
          // NetHack survival mechanics
          hunger: 1000, // Hunger level (1000 = well fed, 0 = starving)
          maxHunger: 1000,
          nutrition: 0, // Current nutrition being digested
          turnCount: 0, // Track turns for hunger/regeneration
          statusEffects: new Map(), // Active status effects
          // NetHack identification system
          identifiedItems: new Set(), // Items the player has identified
          // Search mechanics
          searchCount: 0, // Number of times searched in current location
          searchTarget: null, // What we're searching for
        },
        monsters = [],
        dungeonLevel = 1,
        gameObjects = new Map(),
        deadMonsterMarks = []; // Red X markers for defeated monsters
  // stairs and player models removed per user request
      // playerWalkingModel removed per user request
      let monsterModels = [];

      // Robust helpers for managing scene <-> gameObjects map synchronization.
      // Use these helpers instead of calling scene.add/scene.remove and gameObjects.set/delete directly.
      function addGameObject(key, obj) {
        try {
          if (!key || !obj) return;
          // If object already present under key, remove previous first
          if (gameObjects.has(key)) {
            const prev = gameObjects.get(key);
            try { if (prev && prev.parent) prev.parent.remove(prev); } catch (e) {}
            gameObjects.delete(key);
          }
          // Add to scene if not already attached
          if (obj && !obj.parent) scene.add(obj);
          gameObjects.set(key, obj);
        } catch (e) {
          console.warn('addGameObject failed for', key, e);
        }
      }

      function removeGameObject(key) {
        try {
          if (!gameObjects.has(key)) return;
          const obj = gameObjects.get(key);
          if (obj) {
            try {
              if (obj.parent) obj.parent.remove(obj);
            } catch (e) {}
            // Try to dispose common geometry/material to avoid leaks
            try { if (obj.geometry) obj.geometry.dispose(); } catch (e) {}
            try { if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose && m.dispose());
              else obj.material.dispose && obj.material.dispose();
            } } catch(e) {}
          }
          gameObjects.delete(key);
        } catch (e) {
          console.warn('removeGameObject failed for', key, e);
        }
      }
      let animationMixer = null;
      let monsterTurnTicker = 0;
      let clock = new THREE.Clock();
      let sounds = {};
      let isAudioEnabled = true;
      let currentRoomId = null;
  let wallInstancedMesh, floorMesh, ceilingMesh, fpvFloorMesh;
      let isPlayerAnimating = false;
      let playerAnimTime = 0;
      let fpvBobPhase = 0;
      let bobIntensity = 0;
      let isAutoMoving = false;
      let autoTrailGroup = null;
      let autoMoveCancel = false;
      // 🔎 Forensic automove logger
      const AutoMoveForensics = {
        enabled: true,
        session: null,
        start(fromX, fromY, toX, toY, pathLen) {
          if (!this.enabled) return;
          this.session = {
            id: Date.now(),
            from: { x: fromX, y: fromY },
            to: { x: toX, y: toY },
            pathLen,
            steps: []
          };
          console.groupCollapsed(`🚶‍♂️ AutoMove start #${this.session.id} from (${fromX},${fromY}) -> (${toX},${toY}) len=${pathLen}`);
          console.log('flags:init', { isAutoMoving, autoMoveCancel, wasHit: player.wasHit, health: player.health });
        },
        step(i, step, flags) {
          if (!this.enabled || !this.session) return;
          this.session.steps.push({ i, step, flags });
          console.log(`step ${i}/${this.session.pathLen - 1}`, {
            playerPos: { x: player.x, y: player.y },
            step,
            ...flags
          });
        },
        moved(i) {
          if (!this.enabled || !this.session) return;
          console.log(`✓ moved to`, { i, playerPos: { x: player.x, y: player.y } });
        },
        blocked(reason) {
          if (!this.enabled || !this.session) return;
          console.warn('⛔ blocked', reason);
          console.groupEnd();
          this.session = null;
        },
        cancelled(reason) {
          if (!this.enabled || !this.session) return;
          console.warn('✋ cancelled', reason);
          console.groupEnd();
          this.session = null;
        },
        done() {
          if (!this.enabled || !this.session) return;
          console.log('✅ arrived', { pos: { x: player.x, y: player.y } });
          console.groupEnd();
          this.session = null;
        }
      };
      let playerStartPos = new THREE.Vector3();
      let playerTargetPos = new THREE.Vector3();
      let playerTargetRotation = new THREE.Quaternion();
      let isPanning = false,
        isRotating = false;
      let previousMousePosition = { x: 0, y: 0 };
      let panOffset = new THREE.Vector3(0, 0, 0);
  let zoomLevel = 5; // 100% closer zoom (was 10, now 5 for twice as close)
  // store a stable default so we can temporarily zoom when entering corridors
  let mapDefaultZoom = zoomLevel;
      // North-up map: angle 0 means looking from South to North (N at top)
      let cameraAngle = 0;
      const MIN_ZOOM = 8,
        MAX_ZOOM = 60;
      // Initialize vertical zoom slider now that constants are defined
      (function setupZoomSlider(){
        const slider = document.getElementById('map-zoom-slider');
        if (!slider) return;
        slider.min = String(MIN_ZOOM);
        slider.max = String(MAX_ZOOM);
        slider.value = String(Math.round(zoomLevel));
        slider.addEventListener('input', () => {
          const val = Number(slider.value);
          desiredZoomLevel = THREE.MathUtils.clamp(val, MIN_ZOOM, MAX_ZOOM);
          zoomLevel = desiredZoomLevel;
          // keep the default zoom in sync with user adjustments
          mapDefaultZoom = zoomLevel;
          updateCamera(true);
        });
      })();
      // Adjust the map zoom when stepping into tiles (called from movement code)

      let _fpsT = performance.now(),
        _fpsCount = 0;
      let radarAngle = 0;
      let radarCanvasTop, radarCtxTop, radarCanvasPanel, radarCtxPanel;
      let ghostWallPool = [];
      const GHOST_WALL_POOL_SIZE = 10;
      let ghostedInstances = [];
  let mapCameraTarget = new THREE.Vector3();
      let mapCameraPosition = new THREE.Vector3();
      let isMapCameraAnimating = false;
      let userHasPanned = false;
      
      // Combat camera state
      let isInCombat = false;
      let combatCameraTransitionStart = 0;
      let combatTarget = null;
      let normalCameraHeight = 3.6; // Current normal height (6 feet above 6-foot player)
      // Map view dimensions for viewport calculations
      let mapViewWidth = 0;
      let mapViewHeight = 0;
      // desired zoom is target we lerp towards (allows smooth zoom transitions)
      let desiredZoomLevel = zoomLevel;
      // Discovery state for rooms and hallways
      let discoveredRooms;
  // Debug toggles (performance-friendly defaults)
  const DEBUG_TILE_LABELS = true;
  const DEBUG_RENDER_LOGS = false;
  const statusEl = document.getElementById('runtime-status');
  function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }

      // Player model helpers removed per user request

      const GameTurnManager = {
        currentTurn: "PLAYER",
        isProcessing: false,
        actionQueue: [],

        queuePlayerAction(actionFn, ...args) {
          return new Promise((resolve) => {
            this.actionQueue.push({ actionFn, args, resolve });
            this._drainQueue();
          });
        },

        async _drainQueue() {
          if (this.isProcessing) return;
          this.isProcessing = true;
          try {
            while (this.actionQueue.length) {
              const { actionFn, args, resolve } = this.actionQueue.shift();
              const result = actionFn ? actionFn(...args) : undefined;
              if (result && typeof result.then === "function") {
                await result;
              }
              this.currentTurn = "MONSTERS";
              await this.processMonsterTurns();
              this.currentTurn = "PLAYER";
              if (resolve) resolve();
            }
          } finally {
            this.isProcessing = false;
          }
        },

        async processMonsterTurns() {
          if (this.currentTurn !== 'MONSTERS') return;
          for (const monster of monsters) {
            if (monster.health > 0) {
              try {
                updateMonsterAI(monster);
              } catch (e) {
                console.warn('Monster AI error (skipping this tick):', e);
              }
            }
          }
        },
      };

      function quickTurn(degrees) {
        player.rotationY += THREE.MathUtils.degToRad(degrees);
        playerTargetRotation.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          player.rotationY
        );
        if (player.object) player.object.quaternion.copy(playerTargetRotation);
        setCompassHeading(player.rotationY);
  updateTuningMonsterArrow(); // Sync monster arrow to player rotation
        return Promise.resolve();
      }

      // --- UI Elements ---
      const messageLogEl = document.getElementById("message-log");
      const roomEventEl = document.getElementById("room-event");
      const locationLabelEl = document.getElementById("location-label");
      const roomDescriptions = {
        corridor:
          "A narrow hallway stretches ahead. Torchlight flickers on white stone walls.",
        R1: "A small training room. Tatami mats line the floor; a wooden dummy stands silent.",
        R2: "A meditation chamber. Incense lingers in the air and a bronze gong rests nearby.",
      };
      function setRoomDescription(id) {
        const key =
          id && roomDescriptions[id]
            ? id
            : id === "corridor"
            ? "corridor"
            : null;
        
        // Add room description to Event Log instead of room container
        if (key && roomDescriptions[key]) {
          logMessage(roomDescriptions[key], "#a8a8a8");
        }
      }
      function setLocationLabel(id) {
        const label = id
          ? String(id).replace(/_/g, " ").toUpperCase()
          : "HALLWAY";
        
        // Add location info to Event Log instead of room container
        logMessage(`Location: ${label}`, "#87ceeb");
        
        // Still update the HUD room tag for FPV view
        if (locationLabelEl) locationLabelEl.textContent = `Location: ${label}`;
      }
      const commandInput = document.getElementById("dnd-game-command-input");
      const adventureCommandInput = document.getElementById("dnd-adventure-command-input");

      // --- Procedural Texture Generation ---
      function makeWoodTexture(baseColor) {
        const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
        ctx.fillStyle = baseColor; ctx.fillRect(0,0,512,512);
        const plankH = 40;
        for (let y=0;y<512;y+=plankH){
            ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0,y,512,plankH/2);
            ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0,y+plankH/2,512,plankH/2);
            ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0,y+plankH-1,512,1);
        }
        for (let i=0;i<700;i++){
            const y = Math.random()*512; const len = 40+Math.random()*120; const x = Math.random()*512; const a = Math.random()*0.12;
            ctx.strokeStyle = `rgba(255,255,255,${a*0.5})`; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(Math.min(512,x+len), y+Math.sin(y*0.05)*2); ctx.stroke();
            ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(Math.min(512,x+len), y+2+Math.sin((y+2)*0.05)*2); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2,2); return tex;
      }

      function drawShojiPaper(ctx, size) {
        // High-end washi/rice paper with subtle fibers
        ctx.fillStyle = "#FAF3E0";
        ctx.fillRect(0, 0, size, size);
        
        // Rice paper fibers (premium look)
        ctx.strokeStyle = "rgba(180, 160, 140, 0.12)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 400; i++) {
            const x1 = Math.random() * size;
            const y1 = Math.random() * size;
            const length = 5 + Math.random() * 30;
            const angle = Math.random() * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + Math.cos(angle) * length, y1 + Math.sin(angle) * length);
            ctx.stroke();
        }
        
        // Subtle grunge/depth
        ctx.fillStyle = "rgba(100,80,60,0.06)";
        for (let i = 0; i < 2000; i++) {
            ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
        }
      }
      function drawShojiFrame(ctx, size, thick = 24) {
        // Polished lacquered wood frame
        ctx.fillStyle = "#2c180e"; // Darker base
        ctx.fillRect(0, 0, size, thick);
        ctx.fillRect(0, size - thick, size, thick);
        ctx.fillRect(0, 0, thick, size);
        ctx.fillRect(size - thick, 0, thick, size);
        
        // Bevel highlight
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(2, 2, size-4, 2);
        ctx.fillRect(2, 2, 2, size-4);
      }

      function createDungeonWallTexture(style = 'grid') {
        const canvas = document.createElement("canvas");
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        
        if (style === 'slats') {
            // Precise vertical Dojo slats
            ctx.fillStyle = "#2c180e";
            ctx.fillRect(0, 0, size, size);
            
            const slatCount = 12;
            const slatWidth = size / slatCount;
            for (let i = 0; i < slatCount; i++) {
                // Alternating slat shades
                ctx.fillStyle = i % 2 === 0 ? "#3a2114" : "#2c180e";
                ctx.fillRect(i * slatWidth + 2, 0, slatWidth - 4, size);
                
                // Slat highlight
                ctx.fillStyle = "rgba(255,255,255,0.06)";
                ctx.fillRect(i * slatWidth + 2, 0, 2, size);
            }
            drawShojiFrame(ctx, size, 32);
        } else if (style === 'empty') {
            // "Empty" shoji frame (no paper)
            ctx.clearRect(0, 0, size, size);
            drawShojiFrame(ctx, size, 24);
            ctx.fillStyle = "#2c180e";
            const thin = 12;
            const thick = 24;
            // Draw common grid, but without paper backdrop
            for (let i = 1; i < 4; i++) {
                const x = (size / 4) * i - thin / 2;
                ctx.fillRect(x, thick, thin, size - thick*2);
            }
            for (let i = 1; i < 4; i++) {
                const y = (size / 4) * i - thin / 2;
                ctx.fillRect(thick, y, size - thick*2, thin);
            }
        } else {
            drawShojiPaper(ctx, size);
            if (style === 'plain') {
                drawShojiFrame(ctx, size, 24);
            } 
            else if (style === 'grid') {
                drawShojiFrame(ctx, size, 24);
                ctx.fillStyle = "#2c180e";
                const thin = 12;
                const thick = 24;
                for (let i = 1; i < 4; i++) {
                    const x = (size / 4) * i - thin / 2;
                    ctx.fillRect(x, thick, thin, size - thick*2);
                }
                for (let i = 1; i < 4; i++) {
                    const y = (size / 4) * i - thin / 2;
                    ctx.fillRect(thick, y, size - thick*2, thin);
                }
            }
            else if (style === 'sun') {
                drawShojiFrame(ctx, size, 24);
                ctx.fillStyle = "rgba(180, 40, 40, 0.9)";
                ctx.beginPath();
                ctx.arc(size/2, size/2, size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                // dirt/grunge on the sun
                ctx.fillStyle = "rgba(100,80,60,0.15)";
                for (let i = 0; i < 1500; i++) {
                   const a = Math.random() * Math.PI * 2;
                   const r = Math.sqrt(Math.random()) * size * 0.25;
                   ctx.fillRect(size/2 + Math.cos(a)*r, size/2 + Math.sin(a)*r, 4, 4);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
      }

      // --- Automove Trail Helpers ---
      function ensureAutoTrailGroup() {
        if (!autoTrailGroup) {
          autoTrailGroup = new THREE.Group();
          addGameObject('autoTrailGroup', autoTrailGroup);
        }
      }
      function clearAutoTrail() {
        if (!autoTrailGroup) return;
        // Use centralized removal helper and then dispose children
        try { removeGameObject('autoTrailGroup'); } catch (e) {}
        autoTrailGroup.traverse((n) => {
          if (n.geometry) n.geometry.dispose();
          if (n.material) n.material.dispose();
        });
        autoTrailGroup = null;
      }
      function addTrailMarker(x, y) {
        ensureAutoTrailGroup();
        const size = TILE_SIZE * 0.9;
        const planeGeo = new THREE.PlaneGeometry(size, size);
        // Faint black square for automove trail (subtle, adheres to palette)
        const planeMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthTest: true,
        }); // faint light green
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(x * TILE_SIZE, 0.012, y * TILE_SIZE);
        autoTrailGroup.add(plane);
        // Center black circle
        const dotGeo = new THREE.CircleGeometry(size * 0.14, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(x * TILE_SIZE, 0.013, y * TILE_SIZE);
        autoTrailGroup.add(dot);
      }

      // --- Reusable Materials & Geometries ---
  // Increase wall height: base 1.3 * 1.25 => 1.625x TILE_SIZE (25% taller than previous)
  const WALL_HEIGHT = TILE_SIZE * 1.625; // FPV walls taller by 25%
      const floorTexture = makeWoodTexture('#4b3621');
      // Synchronized floor materials: Both FPV and Map use high-end Lacquer Wood
      const floorMaterial = new THREE.MeshPhysicalMaterial({
        map: floorTexture,
        roughness: 0.25, 
        metalness: 0.15,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        reflectivity: 0.4,
        envMapIntensity: 1.0,
      });
      // Map view floor (exact match to FPV floor)
      const mapFloorMaterial = new THREE.MeshPhysicalMaterial({
        map: floorTexture,
        color: 0xffffff,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        roughness: 0.25,
        metalness: 0.15,
        reflectivity: 0.4,
        envMapIntensity: 1.0,
      });
      
      // Create dark wood rafter texture
      function createDarkWoodRafterTexture() {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Base dark wood color
        ctx.fillStyle = "#2B1810"; // Dark brown wood
        ctx.fillRect(0, 0, size, size);

        // Add wood grain noise
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const randomFactor = (Math.random() - 0.5) * 20;
          data[i]   += randomFactor;
          data[i+1] += randomFactor * 0.8; // Less variation in green
          data[i+2] += randomFactor * 0.6; // Even less in blue for brown tone
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw rafter beams - horizontal planks
        ctx.fillStyle = "#1A0F08"; // Even darker for beam depth
        const beamWidth = 40;
        const beamSpacing = 80;
        for (let y = 0; y < size; y += beamSpacing) {
          ctx.fillRect(0, y, size, beamWidth);
        }

        // Draw vertical support beams (less frequent)
        ctx.fillStyle = "#1A0F08";
        const vertBeamWidth = 30;
        const vertBeamSpacing = 120;
        for (let x = 0; x < size; x += vertBeamSpacing) {
          ctx.fillRect(x, 0, vertBeamWidth, size);
        }

        // Add wood texture lines
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
          const y = Math.random() * size;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2); // Tile the rafter pattern
        return tex;
      }

      // Dark wood rafter ceiling material for FPV
      const rafterCeilingMaterial = new THREE.MeshStandardMaterial({
        map: createDarkWoodRafterTexture(),
        color: 0xFFFFFF,  // Use white so texture shows its true colors
        roughness: 0.9,
        metalness: 0.05,
      });

      // TILE LABELING SYSTEM FOR DEBUGGING
      let tileLabelsGroup = null;
      function addTileLabels() {
        // Remove existing labels via central registry
        if (tileLabelsGroup) {
          removeGameObject('tileLabelsGroup');
          tileLabelsGroup = null;
        }

        tileLabelsGroup = new THREE.Group();

        // Create small flat labels for each floor tile
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            if (tile.type === TILE.FLOOR) {
              // Determine label: R for room, H for hallway/corridor
              const isRoom = tile.roomId && tile.roomId !== "corridor";
              const labelText = isRoom ? "R" : "H";

              // Create text texture
              const canvas = document.createElement("canvas");
              const size = 64;
              canvas.width = size;
              canvas.height = size;
              const context = canvas.getContext("2d");

              // Transparent background (no tan background)
              context.clearRect(0, 0, size, size);

              // Black text per strict mapview palette
              context.fillStyle = "#000000";
              context.font = "bold 32px Arial";
              context.textAlign = "center";
              context.textBaseline = "middle";
              context.fillText(labelText, size / 2, size / 2);

              const texture = new THREE.CanvasTexture(canvas);

              // Create flat plane geometry instead of sprite
              const labelGeo = new THREE.PlaneGeometry(
                TILE_SIZE * 0.3,
                TILE_SIZE * 0.3
              );
              const labelMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.8,
              });

              const labelPlane = new THREE.Mesh(labelGeo, labelMat);
              labelPlane.rotation.x = -Math.PI / 2; // Flat against floor
              // Position in bottom-right corner of tile
              labelPlane.position.set(
                x * TILE_SIZE + TILE_SIZE * 0.35, // Right side
                0.01, // Just above floor
                y * TILE_SIZE + TILE_SIZE * 0.35 // Bottom side
              );

              tileLabelsGroup.add(labelPlane);
            }
          }
        }
        addGameObject('tileLabelsGroup', tileLabelsGroup);
      }

        // Initialize FPV keypad dice visuals and handlers
        (function initFPVKeypad() {
          try {
            const setup = () => {
              try {
                const dice = document.getElementById('fpv-3d-dice') || document.getElementById('fpv-3d-dice');
                const visualDice = document.getElementById('fpv-3d-dice') || document.querySelector('.dnd-game-3d-dice');
                if (visualDice) visualDice.classList.add('idle');
                const visualKeypad = document.getElementById('dnd-game-visual-keypad');
                // Ensure the dice button background matches movement buttons (do not apply 'tan')

                // Support both legacy fpv-dice-btn and the 001.E visual keypad ID
                const diceBtn = document.getElementById('fpv-dice-btn') || document.getElementById('dnd-game-visual-keypad');
                if (diceBtn) {
                  diceBtn.addEventListener('click', (e) => {
                    try {
                      // Visual roll
                      const d = document.querySelector('.dnd-game-3d-dice');
                      if (d) {
                        d.classList.remove('idle');
                        d.classList.add('rolling');
                        // After roll animation, return to idle
                        setTimeout(() => {
                          d.classList.remove('rolling');
                          d.classList.add('idle');
                        }, 1200);
                      }

                      // Trigger existing game interaction if available
                      if (typeof rollCenterDice === 'function') {
                        try { rollCenterDice(); } catch(e) {}
                      }
                      if (typeof setAllMonstersGaming === 'function') {
                        try { setAllMonstersGaming(); } catch(e) {}
                      }
                      if (typeof handleInteract === 'function') {
                        handleInteract();
                      } else if (typeof window.handleInteract === 'function') {
                        window.handleInteract();
                      }
                    } catch (err) { console.warn('fpv-dice-btn click failed', err); }
                  });
                }
                // Movement buttons (both old and new patterns)
                try {
                  const moveBtns = document.querySelectorAll('#fpv-keypad .dnd-game-move-btn');
                  moveBtns.forEach(btn => {
                    const dir = btn.getAttribute('data-dir');
                    if (!dir) return;
                    btn.addEventListener('click', (ev) => {
                      try {
                        if (typeof window.movePlayerDir === 'function') window.movePlayerDir(dir);
                      } catch(e) { console.warn('move button handler failed', e); }
                    });
                  });
                  
                  // Wire up 001.E pattern buttons by ID
                  const buttonMap = {
                    'dnd-game-move-up': 'up',
                    'dnd-game-move-down': 'down', 
                    'dnd-game-move-left': 'left',
                    'dnd-game-move-right': 'right'
                  };
                  
                  Object.entries(buttonMap).forEach(([id, dir]) => {
                    const btn = document.getElementById(id);
                    if (btn) {
                      console.log('🎯 Wiring button:', id, '->', dir);
                      btn.addEventListener('click', (ev) => {
                        try {
                          console.log('🔘 Button clicked:', id, dir);
                          if (typeof window.movePlayerDir === 'function') window.movePlayerDir(dir);
                        } catch(e) { console.warn('001.E button handler failed', e); }
                      });
                    } else {
                      console.warn('❌ Button not found:', id);
                    }
                  });
                  
                } catch(e) { console.warn('move button wiring failed', e); }

                // Ensure keypad is positioned and remains positioned on resize
                try { positionKeypad(); } catch(e) {}
                window.addEventListener('resize', () => { try { positionKeypad(); } catch(e) {} });
              } catch (e) { console.warn('setup FPV keypad failed', e); }
            };

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
            else setup();
          } catch (e) { console.warn('initFPVKeypad failed', e); }
        })();


      const wallMaterial = new THREE.MeshStandardMaterial({
        map: createDungeonWallTexture(),
        roughness: 0.75, // Slightly more reflective
        metalness: 0.1, // Subtle metallic hints
        envMapIntensity: 0.6,
      });
      const wallTopMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.8,
        metalness: 0.2,
      });
      // Black material for empty space wall tops (reverting palette: empty space walls are black)
      const emptySpaceWallTopMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000, // Black for empty space wall tops
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        roughness: 0.5,
        metalness: 0.1
      });
      
      // Black material for empty space walls (sides)
      const emptySpaceWallSideMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000, // Black for empty space wall sides
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        roughness: 0.5,
        metalness: 0.1
      });
      const stepGeo = new THREE.BoxGeometry(
        TILE_SIZE * 0.6,
        0.1,
        TILE_SIZE * 0.2
      );
      let lootCorpseMaterial;
      const lootPileGeometry = new THREE.PlaneGeometry(
        TILE_SIZE * 0.5,
        TILE_SIZE * 0.5
      );
      lootPileGeometry.rotateX(-Math.PI / 2);

      // --- Custom Object Creation ---
      function createPlayerObject() {
        const group = new THREE.Group();
        const baseSize = TILE_SIZE * 0.4;
        const tokenBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8*baseSize, 0.8*baseSize, 0.15*baseSize, 32), new THREE.MeshPhysicalMaterial({ color: 0xaa8800, metalness: 0.95, roughness: 0.05, clearcoat: 1.0, reflectivity: 1.0 }));
        const innerRing = new THREE.Mesh(new THREE.CylinderGeometry(0.7*baseSize, 0.7*baseSize, 0.2*baseSize, 32), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
        innerRing.position.y = 0.05 * baseSize;
        const heroMarker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * baseSize, 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0x00ffff, emissiveIntensity: 0.8, roughness: 0, clearcoat: 1.0, transmission: 0.5, thickness: 0.5, transparent: true, opacity: 0.9 }));
        heroMarker.position.y = 0.5 * baseSize;
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.6 * baseSize, 0.03 * baseSize, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 }));
        halo.rotation.x = Math.PI / 2; halo.position.y = 0.5 * baseSize;
        group.add(tokenBase, innerRing, heroMarker, halo);
        group.traverse(child => { if (child.layers) { child.layers.enable(0); child.layers.enable(FPV_MODEL_LAYER); } });
        const arrowShape = new THREE.Shape();
        const arrowSize = TILE_SIZE * 0.15;
        arrowShape.moveTo(0, arrowSize);
        arrowShape.lineTo(arrowSize * 0.7, -arrowSize);
        arrowShape.lineTo(-arrowSize * 0.7, -arrowSize);
        arrowShape.closePath();
        const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Changed from black to white
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.z = -TILE_SIZE * 0.25 + 0.02;
        arrow.position.y = 0.021; // Above the border
  arrow.layers.set(0); // Default layer for map
  arrow.layers.enable(FPV_MODEL_LAYER);
        group.add(arrow);

        // Player walking model removed temporarily

        // Warm fill near player for bounce feel
        playerLight = new THREE.PointLight(
          TUNING.lighting.playerFill.color,
          TUNING.lighting.playerFill.intensity,
          TUNING.lighting.playerFill.distance,
          TUNING.lighting.playerFill.decay
        );
        playerLight.castShadow = true;
        playerLight.shadow.bias = -0.005;
        playerLight.shadow.mapSize.width = 1024;
        playerLight.shadow.mapSize.height = 1024;
        playerLight.position.set(0, 1.8, -0.8); // Positioned in front of player
        // Make player light FPV-only so it doesn't wash the tactical map
        playerLight.layers.set(FPV_MODEL_LAYER);
        group.add(playerLight);
        const headlamp = new THREE.SpotLight(
          TUNING.lighting.headlamp.color,
          TUNING.lighting.headlamp.intensity,
          TUNING.lighting.headlamp.distance,
          TUNING.lighting.headlamp.angle,
          TUNING.lighting.headlamp.penumbra,
          TUNING.lighting.headlamp.decay
        );
        headlamp.position.set(0, 1.7, -1.2); // Moved in front of player (negative Z is forward)
        headlamp.castShadow = true;
        headlamp.shadow.mapSize.width = 1024;
        headlamp.shadow.mapSize.height = 1024;
        headlamp.layers.set(FPV_MODEL_LAYER);
        const headlampTarget = new THREE.Object3D();
        headlampTarget.position.set(0, 1.6, -5);
        headlampTarget.layers.set(FPV_MODEL_LAYER);
        group.add(headlamp);
  // Parent target to scene so we can set world coordinates directly
  addGameObject('headlampTarget', headlampTarget);
        headlamp.target = headlampTarget;
        group.add(headlamp);
        group.add(headlampTarget);
        headlamp.target = headlampTarget;
        group.userData.visuals = group.userData.visuals || {};
        group.userData.visuals.headlamp = headlamp;
        
        // Flashlight - visible on both FPV and map view
        const flashlight = new THREE.SpotLight(
          TUNING.lighting.flashlight.color,
          TUNING.lighting.flashlight.intensity,
          TUNING.lighting.flashlight.distance,
          TUNING.lighting.flashlight.angle,
          TUNING.lighting.flashlight.penumbra,
          TUNING.lighting.flashlight.decay
        );
        flashlight.position.set(0, 1.5, -1.0); // Moved in front of player (negative Z is forward)
        flashlight.castShadow = true;
        flashlight.shadow.mapSize.width = 512;
        flashlight.shadow.mapSize.height = 512;
        // Flashlight visible on both layers - FPV and map
        flashlight.layers.set(0); // Default layer for map
        flashlight.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV
        
        const flashlightTarget = new THREE.Object3D();
        flashlightTarget.position.set(0, 1.4, -10);
        flashlightTarget.layers.set(0);
        flashlightTarget.layers.enable(FPV_MODEL_LAYER);
        group.add(flashlight);
  addGameObject('flashlightTarget', flashlightTarget);
        flashlight.target = flashlightTarget;
        group.userData.visuals.flashlight = flashlight;
        group.userData.visuals.flashlightTarget = flashlightTarget;
        
        applyPlayerFillTuning(playerLight);
        applyHeadlampTuning(headlamp);
        applyFlashlightTuning(flashlight);
  // Avatar container for 3D model; FPV-only so it won't render on the tactical map
  const avatar = new THREE.Group();
  avatar.name = "playerAvatar";
  avatar.position.set(0, 0, 0);
  avatar.layers.set(FPV_MODEL_LAYER);
  group.add(avatar);
  group.userData.visuals = group.userData.visuals || {};
  group.userData.visuals.avatar = avatar;

  // Add Player.A.Walking.glb model for map view with walking animations (200% size)
  try {
    const gltfLoader = new THREE.GLTFLoader();
    
    async function loadPlayerMapModel() {
      // Use the working 001.E approach with Player.A.Walking.glb
      const urls = [
        'assets/Player.A.Walking.glb',
        new URL('assets/Player.A.Walking.glb', document.baseURI).href,
        'https://markpeterson.info/rpgmods/assets/Player.A.Walking.glb',
        'https://markpeterson.info/assets/Player.A.Walking.glb'
      ];
      
      for (const url of urls) {
        try {
          const gltf = await new Promise((resolve, reject) => {
            gltfLoader.load(url, resolve, null, reject);
          });
          
          // Follow 001.E pattern: create avatar container + GLB hierarchy
          const glbRoot = gltf.scene;
          glbRoot.traverse((c) => { 
            if (c.isMesh) { 
              c.castShadow = true; 
              c.receiveShadow = true; 
            } 
          });
          
          // Create avatar container (like 001.E)
          const avatar = new THREE.Object3D();
          avatar.name = 'playerAvatar';
          glbRoot.name = 'playerAvatarModel';
          avatar.add(glbRoot);
          
          // Scale and ground like 001.E but reduce size by 150% (divide by 2.5)
          glbRoot.scale.setScalar(1.5 * 4.0 / 2.5); // Player height (1.5) * 4 / 2.5 = 2.4 total scale
          
          // Ground the feet after scaling (001.E approach)
          glbRoot.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(glbRoot);
          const lowestPoint = box.min.y;
          const groundOffset = 0.05; // Feet clearly above circle
          glbRoot.position.y = groundOffset - lowestPoint;
          glbRoot.updateMatrixWorld(true);
          
          console.log(`Player map model scaled to 2.4 (5ft reduced by 150%), grounded at y=${glbRoot.position.y.toFixed(3)}`);
          
          // Animation setup like 001.E (but we won't use it for map view)
          try {
            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(glbRoot);
              const clip = gltf.animations[0];
              const action = mixer.clipAction(clip);
              action.setLoop(THREE.LoopRepeat);
              action.stop(); // Ensure stopped
              glbRoot.userData.mixer = mixer;
              glbRoot.userData.walkAction = action;
              glbRoot.userData.walkClipDuration = (clip && clip.duration) ? clip.duration : 1.0;
              glbRoot.userData.walking = false;
              console.log(`Map model animation setup complete, duration: ${clip.duration}s`);
            }
          } catch(_) {}
          
          // Set up for map layer
          avatar.userData = avatar.userData || {};
          avatar.userData.excludeFromLayerSync = true;
          avatar.layers.set(0); // Map view layer ONLY
          avatar.rotation.y = TUNING.models.yaw.player;
          
          // Ensure all children stay on map layer
          avatar.traverse((node) => {
            if (node.isMesh) {
              node.layers.set(0);
              node.userData = node.userData || {};
              node.userData.excludeFromLayerSync = true;
            }
          });
          
          avatar.position.set(0, 0.0, -0.3); // Move player behind the front-facing arrow
          avatar.name = 'playerMapModel';
          group.add(avatar);
          group.userData.visuals.mapModel = avatar;
          
          console.log('Player map model (001.E style) loaded successfully:', url);
          return;
        } catch (error) {
          console.warn('Failed to load player map model from:', url, error);
        }
      }
      
      // Fallback to simple cylinder if model loading fails
      const stub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.34, 16),
        new THREE.MeshStandardMaterial({ 
          color: 0xdddddd, 
          roughness: 0.7, 
          metalness: 0.05 
        })
      );
      stub.position.set(0, 0.22, 0);
      stub.name = 'playerModelStub';
      group.add(stub);
      group.userData.visuals.mapModel = stub;
    }
    
    // Load model asynchronously
    loadPlayerMapModel().catch(console.error);
    
  } catch(_) {
    // Emergency fallback
    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.34, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0xdddddd, 
        roughness: 0.7, 
        metalness: 0.05 
      })
    );
    stub.position.set(0, 0.22, 0); // Explicitly center the emergency fallback player model
    stub.name = 'playerModelStub';
    group.add(stub);
    group.userData.visuals.mapModel = stub;
  }

  // Load Player.A.Walking.glb for FPV view (001.E hierarchical approach)
  const loadPlayerFPVModel = () => {
    try {
      if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
        setTimeout(loadPlayerFPVModel, 500);
        return;
      }
      
      const loader = new THREE.GLTFLoader();
      loader.setCrossOrigin && loader.setCrossOrigin('anonymous');
      
      const candidateUrls = [
        'assets/Player.A.Walking.glb',
        new URL('assets/Player.A.Walking.glb', window.location.href).href,
        'https://markpeterson.info/assets/Player.A.Walking.glb'
      ].filter(Boolean);
      
      const tryLoadUrl = (urls) => {
        if (!urls.length) {
          console.warn('All Player.A.Walking.glb URLs failed for FPV, using fallback');
          return;
        }
        
        const url = urls.shift();
        loader.load(url, (gltf) => {
          try {
            // Follow 001.E pattern exactly: GLB root → avatar container → GLB model
            const glbRoot = gltf.scene;
            glbRoot.traverse((c) => { 
              if (c.isMesh) { 
                c.castShadow = true; 
                c.receiveShadow = true; 
                c.layers.set(FPV_MODEL_LAYER);
                if (c.material) {
                  if (Array.isArray(c.material)) {
                    c.material.forEach(mat => {
                      if (mat) mat.toneMapped = false;
                    });
                  } else {
                    c.material.toneMapped = false;
                  }
                }
              } 
            });
            
            // Create avatar container (like 001.E)
            const fpvAvatar = new THREE.Object3D();
            fpvAvatar.name = 'playerFPVAvatar';
            glbRoot.name = 'playerFPVAvatarModel';
            fpvAvatar.add(glbRoot);
            
            // Scale using 001.E approach but for proper player height
            glbRoot.scale.setScalar(1.5); // Player height (1.5 units = 5 feet)
            
            // Ground the feet after scaling (001.E approach)
            glbRoot.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(glbRoot);
            const lowestPoint = box.min.y;
            const groundOffset = 0.05; // Feet clearly above circle to avoid z-fighting
            glbRoot.position.y = groundOffset - lowestPoint;
            glbRoot.updateMatrixWorld(true);
            
            // Apply player model facing correction
            const baseYaw = TUNING.models.yaw.player || 0;
            const fpvFacingCorr = Math.PI; // Rotate 180 degrees to face forward
            fpvAvatar.rotation.y = baseYaw + fpvFacingCorr;
            
            console.log(`FPV model scaled to 1.5 (5ft player), grounded at y=${glbRoot.position.y.toFixed(3)}`);
            
            // Animation setup like 001.E
            try {
              if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(glbRoot);
                const clip = gltf.animations[0];
                const action = mixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat);
                action.stop(); // Ensure stopped
                glbRoot.userData.mixer = mixer;
                glbRoot.userData.walkAction = action;
                glbRoot.userData.walkClipDuration = (clip && clip.duration) ? clip.duration : 1.0;
                glbRoot.userData.walking = false;
                
                console.log(`FPV animation setup complete, duration: ${clip.duration}s`);
                
                // Set up group's animation reference for the existing FPV animation control
                group.userData.playerAnimations = {
                  mixer: mixer,
                  walkAction: action,
                  isWalking: false,
                  walkClipDuration: clip.duration || 1.0
                };
              }
            } catch(_) {}
            
            avatar.add(fpvAvatar);
            group.userData.visuals.model3dFPV = fpvAvatar; // Store the avatar container
            
            console.log(`Player FPV model (001.E style) loaded from ${url}`);
            
          } catch (e) {
            console.warn('Player FPV model attachment failed', e);
            tryLoadUrl(urls);
          }
        }, undefined, (err) => {
          console.warn(`Player FPV model load failed from ${url}`, err);
          tryLoadUrl(urls);
        });
      };
      
      tryLoadUrl([...candidateUrls]);
    } catch (e) {
      console.warn('Player FPV model loader error', e);
    }
  };

  // Initialize game object for movement tracking
  if (!window.game) window.game = {};
  
  // Start loading after a short delay
  setTimeout(loadPlayerFPVModel, 200);
        return group;
      }

      // === MONSTER CREATION FOR TUNING ===
      let monsterObject = null;
      
      function createMonsterForTuning() {
        if (monsterObject) {
          removeGameObject('monster_tuning_object');
          monsterObject = null;
        }

        console.log('Creating monster at player position:', player.x, player.y);
        const group = new THREE.Group();
        const TILE_SIZE = 1;

        // OLD CIRCLES REMOVED - Now handled by updateMonsterCircle() function
        // This prevents duplicate overlapping circles that were causing visual issues

        // Monster arrow (pointing same direction as player initially)
        const arrowGeometry = new THREE.ConeGeometry(TILE_SIZE * 0.15, TILE_SIZE * 0.4, 8); // Made larger
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.z = -TILE_SIZE * 0.25 + 0.02;
        arrow.position.y = 0.031; // Raised higher
  arrow.visible = false; // HIDDEN - monster arrows removed as requested
  arrow.layers.set(0); // Default layer for map
        group.add(arrow);

        // Position monster right next to player for visibility
        const monsterX = (player.x + 1) * TILE_SIZE; // 1 tile to the right
        const monsterZ = player.y * TILE_SIZE; // Same row as player
        group.position.set(monsterX, 0, monsterZ);
        console.log('Monster positioned at world coordinates:', monsterX, 0, monsterZ);
        console.log('Player at grid coordinates:', player.x, player.y);
        console.log('Monster at grid coordinates:', player.x + 1, player.y);

        group.userData.visuals = group.userData.visuals || {};
        group.userData.visuals.arrow = arrow;
        
  monsterObject = group;
  addGameObject('monster_tuning_object', monsterObject);
  console.log('Monster added to scene (registered as monster_tuning_object):', monsterObject);
  
  // Initialize monster visuals system (creates proper tactical circle)
  if (typeof updateMonsterVisuals === 'function') {
    // Create a mock monster object for the tuning monster
    const mockMonster = {
      object: monsterObject,
      aiState: MONSTER_STATES.IDLE
    };
    updateMonsterVisuals(mockMonster);
  }
        
        return group;
      }

      // Update monster arrow to match player rotation (disabled for static arrows)
      function updateTuningMonsterArrow() {
        if (monsterObject && monsterObject.userData.visuals.arrow) {
          const arrow = monsterObject.userData.visuals.arrow;
          // Only update if not marked as static
          if (!arrow.userData.staticArrow) {
            // Match player rotation
            arrow.rotation.y = player.rotationY;
          }
        }
      }

      // === FORENSIC LLM SYNC SYSTEM ===
      class ForensicObjectSyncAnalyzer {
        constructor() {
          this.FPV_MODEL_LAYER = 1;
          this.MAP_LAYER = 0;
          this.syncReport = {};
          this.autoFixEnabled = true;
          this.debugMode = false; // Disable debug mode to reduce console spam
          this.lastScanTime = 0;
          this.scanInterval = 5000; // Reduced frequency to 5 seconds
          
          // Rate limiting for log output
          this.consecutiveScans = 0;
          this.maxConsecutiveScans = 3;
          this.lastIssueCount = 0;
          this.isScanningPaused = false;
          this.isInitialScan = true;
          
          // Monster circle analysis
          this.monsterCircleComponents = {};
          this.arrowVisibilityIssues = [];
          
          this.init();
        }
        
        analyzeMonsterCircles() {
          console.log("🔍 FORENSIC ANALYSIS: Monster Circle Components");
          const analysis = {
            timestamp: Date.now(),
            circles: {},
            arrowVisibility: {},
            whiteBorders: {},
            issues: []
          };
          
          // Find all monster objects in the scene
          scene.traverse((object) => {
            if (object.userData && object.userData.visuals) {
              const visuals = object.userData.visuals;
              
              // Check if this is a monster object
              if (visuals.indicator || visuals.arrow || visuals.border) {
                const monsterId = object.name || object.uuid;
                
                analysis.circles[monsterId] = {
                  hasIndicator: !!visuals.indicator,
                  hasArrow: !!visuals.arrow,
                  hasBorder: !!visuals.border,
                  hasWhiteBorder: !!visuals.whiteBorder,
                  hasSearchIndicator: !!visuals.searchIndicator
                };
                
                // Analyze arrow visibility
                if (visuals.arrow) {
                  const arrow = visuals.arrow;
                  analysis.arrowVisibility[monsterId] = {
                    visible: arrow.visible,
                    position: {x: arrow.position.x, y: arrow.position.y, z: arrow.position.z},
                    rotation: {x: arrow.rotation.x, y: arrow.rotation.y, z: arrow.rotation.z},
                    inMapLayer: arrow.layers.test(this.MAP_LAYER),
                    inFPVLayer: arrow.layers.test(this.FPV_MODEL_LAYER),
                    staticArrow: !!arrow.userData.staticArrow
                  };
                  
                  // Issue detection
                  if (arrow.visible) {
                    analysis.issues.push({
                      type: 'ARROW_VISIBLE',
                      monsterId: monsterId,
                      message: `Monster arrow is visible when it should be hidden`,
                      arrow: arrow
                    });
                  }
                }
                
                // Analyze white border visibility
                if (visuals.whiteBorder) {
                  analysis.whiteBorders[monsterId] = {
                    visible: visuals.whiteBorder.visible,
                    position: visuals.whiteBorder.position,
                    material: visuals.whiteBorder.material.color.getHexString()
                  };
                } else {
                  analysis.issues.push({
                    type: 'MISSING_WHITE_BORDER',
                    monsterId: monsterId,
                    message: `Monster is missing white border circle`
                  });
                }
              }
            }
          });
          
          console.log("📊 Monster Circle Analysis:", analysis);
          
          // Auto-fix arrows if enabled
          if (this.autoFixEnabled) {
            this.autoFixArrowVisibility(analysis.issues);
          }
          
          return analysis;
        }
        
        autoFixArrowVisibility(issues) {
          issues.forEach(issue => {
            if (issue.type === 'ARROW_VISIBLE') {
              console.log(`🔧 AUTO-FIX: Hiding monster arrow for ${issue.monsterId}`);
              issue.arrow.visible = false;
            }
          });
        }
        
        init() {
          console.log('🔍 Forensic Object Sync Analyzer initialized');
          
          // Start continuous monitoring via scheduleScan (rate-limited)
          this._scanTimer = setInterval(() => { this.scheduleScan(); }, this.scanInterval);
          
          // Add keyboard shortcut for manual analysis
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
              e.preventDefault();
              this.performFullAnalysis();
            }
          });
        }

        // scheduleScan: rate-limited wrapper to avoid repeated immediate scans and console spam
        scheduleScan(force=false) {
          try {
            const now = Date.now();
            // Allow forced immediate scan
            if (force) { this.performForensicScan(); return; }

            // If last scan was recent, skip
            if (now - this.lastScanTime < (this.scanInterval - 1000)) {
              // Increment counters but don't scan
              this.consecutiveScans = Math.min(this.consecutiveScans + 1, this.maxConsecutiveScans);
              return;
            }

            this.performForensicScan();
          } catch (e) { console.warn('scheduleScan failed', e); }
        }
        
        performForensicScan() {
          this.lastScanTime = Date.now();
          const scanResults = this.scanAllSceneObjects();
          const syncIssues = this.analyzeSyncIssues(scanResults);
          
          // NEW: Analyze monster circles specifically
          const monsterAnalysis = this.analyzeMonsterCircles();
          
          // Rate limit console warnings to reduce spam
          if (syncIssues.length > 0) {
            // Implement rate limiting for console warnings
            const shouldLog = this.shouldLogWarning(syncIssues.length);

            // Deduplicate identical warnings within short timeframe
            const warnKey = `SYNC_${syncIssues.length}`;
            const now = Date.now();
            this._lastWarns = this._lastWarns || {};
            const last = this._lastWarns[warnKey] || 0;
            const dedupeWindow = 8000; // 8s window to avoid repeated identical warnings

            if (shouldLog && (now - last) > dedupeWindow) {
              console.warn('🚨 SYNC ISSUES DETECTED:', syncIssues.length, 'objects');
              this._lastWarns[warnKey] = now;
            }
            
            if (this.autoFixEnabled) {
              this.applySyncFixes(syncIssues);
            }
          } else {
            // Reset consecutive scans counter when no issues found
            this.consecutiveScans = 0;
          }
          
          // Update sync report
          this.syncReport = {
            timestamp: this.lastScanTime,
            totalObjects: scanResults.length,
            syncIssues: syncIssues.length,
            fixesApplied: this.autoFixEnabled ? syncIssues.length : 0,
            monsterCircleIssues: monsterAnalysis.issues.length
          };
          
          if (this.debugMode && (syncIssues.length > 0 || monsterAnalysis.issues.length > 0)) {
            // Only log detailed report if we're showing warnings
            if (this.shouldLogWarning(syncIssues.length)) {
              this.logDetailedReport(scanResults, syncIssues);
            }
          }
        }
        
        shouldLogWarning(currentIssueCount) {
          // Always log if issue count changed significantly
          if (Math.abs(currentIssueCount - this.lastIssueCount) > 10) {
            this.consecutiveScans = 0;
            this.lastIssueCount = currentIssueCount;
            return true;
          }
          
          // Increment consecutive scans counter
          this.consecutiveScans++;
          
          // Only log every maxConsecutiveScans times to reduce console spam
          const shouldLog = this.consecutiveScans >= this.maxConsecutiveScans;
          
          // Reset counter if we're logging
          if (shouldLog) {
            this.consecutiveScans = 0;
            this.lastIssueCount = currentIssueCount;
          }
          
          return shouldLog;
        }
        
        scanAllSceneObjects() {
          const objects = [];
          
          // Scan all scene children recursively
          scene.traverse((object) => {
            if (object !== scene) {
              const analysis = this.analyzeObject(object);
              if (analysis.isRelevant) {
                objects.push(analysis);
              }
            }
          });
          
          return objects;
        }
        
        analyzeObject(object) {
          const analysis = {
            object: object,
            name: object.name || 'unnamed',
            type: object.type,
            isRelevant: false,
            layers: [],
            visibleInFPV: false,
            visibleInMap: false,
            shouldBeVisibleInBoth: false,
            syncStatus: 'unknown',
            position: object.position.clone(),
            userData: object.userData
          };
          
          // Determine if object is relevant for sync analysis
          analysis.isRelevant = this.isObjectRelevant(object);
          
          if (analysis.isRelevant) {
            // Analyze layer assignments
            for (let i = 0; i <= 31; i++) {
              if (object.layers.test(i)) {
                analysis.layers.push(i);
              }
            }
            
            analysis.visibleInFPV = object.layers.test(this.FPV_MODEL_LAYER);
            analysis.visibleInMap = object.layers.test(this.MAP_LAYER);
            
            // Determine if object should be visible in both views
            analysis.shouldBeVisibleInBoth = this.shouldObjectBeVisibleInBoth(object);
            
            // Determine sync status
            if (analysis.shouldBeVisibleInBoth) {
              if (analysis.visibleInFPV && analysis.visibleInMap) {
                analysis.syncStatus = 'synced';
              } else if (analysis.visibleInFPV || analysis.visibleInMap) {
                analysis.syncStatus = 'partial';
              } else {
                analysis.syncStatus = 'invisible';
              }
            } else {
              analysis.syncStatus = 'not-required';
            }
          }
          
          return analysis;
        }
        
        isObjectRelevant(object) {
          // Check if object should be analyzed for sync
          
          // Player objects
          if (object.parent && object.parent === player.object) return true;
          
          // Monster objects  
          if (object.parent && object.parent === monsterObject) return true;
          if (object === monsterObject) return true;
          
          // Direct references to the tuning monster
          if (window.monsterObject && object === window.monsterObject) return true;
          
          // Game objects that should be visible
          if (object.userData.isGameObject) return true;
          if (object.userData.isMonster) return true;
          if (object.userData.isPlayer) return true;
          if (object.userData.isPickup) return true;
          if (object.userData.isInteractable) return true;
          
          // Meshes with game-relevant materials
          if (object.isMesh && object.material) {
            // Skip UI elements, floors, walls, ceilings
            if (object.userData.isUI || 
                object.userData.isFloor || 
                object.userData.isWall || 
                object.userData.isCeiling) {
              return false;
            }
            
            // Include red monster-colored objects
            if (object.material.color && (
                object.material.color.r > 0.5 && 
                object.material.color.g < 0.5 && 
                object.material.color.b < 0.5)) {
              return true;
            }
            
            // Include visible game meshes
            if (object.visible && object.material.opacity > 0) {
              return true;
            }
          }
          
          return false;
        }
        
        shouldObjectBeVisibleInBoth(object) {
          // Determine if an object should be synchronized between views
          
          // Respect explicit exclusion from layer sync
          if (object.userData && object.userData.excludeFromLayerSync) {
            return false;
          }
          
          // Player and monster objects should always be synced
          if (object.parent && (object.parent === player.object || object.parent === monsterObject)) {
            return true;
          }
          
          if (object === monsterObject || object === player.object) {
            return true;
          }
          
          // Game entities should be synced
          if (object.userData.isGameObject || 
              object.userData.isMonster || 
              object.userData.isPlayer || 
              object.userData.isPickup) {
            return true;
          }
          
          // Objects that are clearly game elements (not UI/structure)
          if (object.isMesh && object.visible && object.material && object.material.opacity > 0.1) {
            // Check if it's positioned like a game object (not too high/low)
            if (object.position.y >= -0.1 && object.position.y <= 3.0) {
              return true;
            }
          }
          
          return false;
        }
        
        analyzeSyncIssues(scanResults) {
          const issues = [];
          
          scanResults.forEach(analysis => {
            if (analysis.syncStatus === 'partial' || analysis.syncStatus === 'invisible') {
              issues.push({
                object: analysis.object,
                analysis: analysis,
                issueType: analysis.syncStatus,
                recommendedFix: this.getRecommendedFix(analysis)
              });
            }
          });
          
          return issues;
        }
        
        getRecommendedFix(analysis) {
          if (!analysis.visibleInFPV && !analysis.visibleInMap) {
            return 'enable_both_layers';
          } else if (!analysis.visibleInFPV) {
            return 'enable_fpv_layer';
          } else if (!analysis.visibleInMap) {
            return 'enable_map_layer';
          }
          return 'no_fix_needed';
        }
        
        applySyncFixes(syncIssues) {
          let fixesApplied = 0;
          
          syncIssues.forEach(issue => {
            const { object, recommendedFix } = issue;
            
            try {
              switch (recommendedFix) {
                case 'enable_both_layers':
                  object.layers.set(this.MAP_LAYER);
                  object.layers.enable(this.FPV_MODEL_LAYER);
                  fixesApplied++;
                  break;
                  
                case 'enable_fpv_layer':
                  object.layers.enable(this.FPV_MODEL_LAYER);
                  fixesApplied++;
                  break;
                  
                case 'enable_map_layer':
                  object.layers.enable(this.MAP_LAYER);
                  fixesApplied++;
                  break;
              }
              
              // console.log('✅ Fixed sync for ' + (object.name || object.type) + ': ' + recommendedFix);
              
            } catch (error) {
              console.error('❌ Failed to fix sync for ' + (object.name || object.type) + ':', error);
            }
          });
          
          if (fixesApplied > 0) {
            console.log('🔧 Applied ' + fixesApplied + ' sync fixes');
          }
          
          return fixesApplied;
        }
        
        logDetailedReport(scanResults, syncIssues) {
          console.group('🔍 FORENSIC SYNC ANALYSIS REPORT');
          console.log('📊 Scan Time: ' + new Date(this.lastScanTime).toLocaleTimeString());
          console.log('📈 Total Objects Analyzed: ' + scanResults.length);
          console.log('⚠️  Sync Issues Found: ' + syncIssues.length);
          
          if (syncIssues.length > 0) {
            console.group('🚨 SYNC ISSUES DETAIL');
            syncIssues.forEach((issue, index) => {
              const { object, analysis, issueType, recommendedFix } = issue;
              console.group('Issue #' + (index + 1) + ': ' + (object.name || object.type));
              console.log('Object:', object);
              console.log('Position:', analysis.position);
              console.log('Layers:', analysis.layers);
              console.log('Visible in FPV:', analysis.visibleInFPV);
              console.log('Visible in Map:', analysis.visibleInMap);
              console.log('Issue Type:', issueType);
              console.log('Recommended Fix:', recommendedFix);
              console.groupEnd();
            });
            console.groupEnd();
          }
          
          // Log sync statistics
          const syncStats = this.calculateSyncStats(scanResults);
          console.group('📈 SYNC STATISTICS');
          console.log('Fully Synced:', syncStats.synced);
          console.log('Partially Synced:', syncStats.partial);
          console.log('Not Visible:', syncStats.invisible);
          console.log('Sync Not Required:', syncStats.notRequired);
          console.log('Sync Rate:', syncStats.syncRate.toFixed(1) + '%');
          console.groupEnd();
          
          console.groupEnd();
        }
        
        calculateSyncStats(scanResults) {
          const stats = {
            synced: 0,
            partial: 0,
            invisible: 0,
            notRequired: 0,
            total: scanResults.length
          };
          
          scanResults.forEach(analysis => {
            switch (analysis.syncStatus) {
              case 'synced': stats.synced++; break;
              case 'partial': stats.partial++; break;
              case 'invisible': stats.invisible++; break;
              case 'not-required': stats.notRequired++; break;
            }
          });
          
          const relevantObjects = stats.synced + stats.partial + stats.invisible;
          stats.syncRate = relevantObjects > 0 ? (stats.synced / relevantObjects) * 100 : 100;
          
          return stats;
        }
        
        performFullAnalysis() {
          console.clear();
          console.log('🔍 PERFORMING FULL FORENSIC ANALYSIS...');
          
          // Check and fix camera configuration first
          this.checkAndFixCameraLayers();
          
          // Force immediate scan (go through scheduler for safety)
          try { this.scheduleScan(true); } catch(e) { this.performForensicScan(); }
          
          // Additional deep analysis
          this.analyzeLayerSystem();
          this.analyzeCameraSetup();
          this.analyzeGameObjects();
          
          // NEW: Detailed monster circle analysis
          console.log('🎯 ANALYZING MONSTER CIRCLES...');
          const monsterAnalysis = this.analyzeMonsterCircles();
          
          console.log('✅ Full forensic analysis complete');
        }
        
        checkAndFixCameraLayers() {
          console.log('🔧 Checking camera layer configurations...');
          
          // Check FPV camera
          if (window.fpvCamera) {
            const fpvLayers = this.getCameraLayers(window.fpvCamera);
            const needsLayer0 = !fpvLayers.includes(0);
            const needsFPVLayer = !fpvLayers.includes(this.FPV_MODEL_LAYER);
            
            if (needsLayer0 || needsFPVLayer) {
              console.warn('🚨 FPV Camera layer configuration needs fixing!');
              
              if (needsLayer0) {
                window.fpvCamera.layers.enable(0);
                console.log('✅ Enabled layer 0 for FPV camera');
              }
              
              if (needsFPVLayer) {
                window.fpvCamera.layers.enable(this.FPV_MODEL_LAYER);
                console.log('✅ Enabled FPV_MODEL_LAYER for FPV camera');
              }
              
              console.log('🔧 FPV Camera now sees layers:', this.getCameraLayers(window.fpvCamera));
              
              // Run immediate scan after fixing camera to ensure all objects are sync'd
              setTimeout(() => {
                console.log('🔄 Running immediate forensic scan after camera fix...');
                try { this.scheduleScan(true); } catch(e) { this.performForensicScan(); }
              }, 100);
              
            } else {
              console.log('✅ FPV Camera layer configuration is correct');
            }
          }
          
          // Check Map camera
          if (window.camera) {
            const mapLayers = this.getCameraLayers(window.camera);
            if (!mapLayers.includes(0)) {
              window.camera.layers.enable(0);
              console.log('✅ Enabled layer 0 for Map camera');
            }
          }
        }
        
        analyzeLayerSystem() {
          console.group('🎭 LAYER SYSTEM ANALYSIS');
          console.log('FPV Model Layer:', this.FPV_MODEL_LAYER);
          console.log('Map Layer:', this.MAP_LAYER);
          
          // Check camera layer configurations
          if (window.fpvCamera) {
            console.log('FPV Camera Layers:', this.getCameraLayers(window.fpvCamera));
          }
          if (window.mapCamera) {
            console.log('Map Camera Layers:', this.getCameraLayers(window.mapCamera));
          }
          
          console.groupEnd();
        }
        
        getCameraLayers(camera) {
          const layers = [];
          for (let i = 0; i <= 31; i++) {
            if (camera.layers.test(i)) {
              layers.push(i);
            }
          }
          return layers;
        }
        
        analyzeCameraSetup() {
          console.group('📷 CAMERA SETUP ANALYSIS');
          
          if (window.fpvCamera) {
            const fpvLayers = this.getCameraLayers(window.fpvCamera);
            console.log('FPV Camera:', {
              position: window.fpvCamera.position,
              rotation: window.fpvCamera.rotation,
              layers: fpvLayers,
              canSeeLayer0: fpvLayers.includes(0),
              canSeeFPVLayer: fpvLayers.includes(this.FPV_MODEL_LAYER)
            });
            
            // Warn if FPV camera can't see both layers
            if (!fpvLayers.includes(0) || !fpvLayers.includes(this.FPV_MODEL_LAYER)) {
              console.warn('⚠️ FPV Camera layer configuration issue!');
              console.warn('FPV camera should see both layer 0 and FPV_MODEL_LAYER');
            }
          }
          
          if (window.mapCamera) {
            const mapLayers = this.getCameraLayers(window.mapCamera);
            console.log('Map Camera:', {
              position: window.mapCamera.position,
              rotation: window.mapCamera.rotation,
              layers: mapLayers,
              canSeeLayer0: mapLayers.includes(0)
            });
          }
          
          console.groupEnd();
        }
        
        analyzeGameObjects() {
          console.group('🎮 GAME OBJECTS ANALYSIS');
          
          if (window.player && window.player.object) {
            console.log('Player Object:', this.analyzeObject(window.player.object));
          }
          
          if (window.monsterObject) {
            console.log('Monster Object:', this.analyzeObject(window.monsterObject));
          }
          
          // Analyze all monsters from monsters array
          if (window.monsters && window.monsters.length > 0) {
            console.log('Monsters Array:', window.monsters.length, 'monsters');
            window.monsters.forEach((monster, index) => {
              if (monster.object) {
                console.log('Monster ' + index + ':', this.analyzeObject(monster.object));
              }
            });
          }
          
          console.groupEnd();
        }
        
        // Public API for manual control
        enableAutoFix() {
          this.autoFixEnabled = true;
          console.log('✅ Auto-fix enabled');
        }
        
        disableAutoFix() {
          this.autoFixEnabled = false;
          console.log('⏸️ Auto-fix disabled');
        }
        
        toggleDebugMode() {
          this.debugMode = !this.debugMode;
          console.log('🐛 Debug mode: ' + (this.debugMode ? 'ON' : 'OFF'));
        }
        
        getStatus() {
          return {
            autoFixEnabled: this.autoFixEnabled,
            debugMode: this.debugMode,
            lastScan: this.lastScanTime,
            report: this.syncReport
          };
        }
      }

      // Initialize the forensic system
      // === FORENSIC LLM: MONSTER MODEL ANALYSIS ===
      class MonsterModelForensicAnalyzer {
        constructor() {
          this.analysisResults = {};
          this.debugMode = true;
        }
        
        analyzeMonsterModels() {
          console.log('🔍 FORENSIC ANALYSIS: Monster Model Duplication Investigation');
          const analysis = {
            timestamp: Date.now(),
            monsters: {},
            layerAnalysis: {},
            modelCounts: {},
            visualArtifacts: {},
            issues: []
          };
          
          // Find all monsters in the scene
          scene.traverse((object) => {
            if (object.userData && object.userData.visuals) {
              const visuals = object.userData.visuals;
              
              // Check if this is a monster with models
              if (visuals.model3d || visuals.model3dFPV) {
                const monsterId = object.name || object.uuid;
                
                analysis.monsters[monsterId] = {
                  hasMapModel: !!visuals.model3d,
                  hasFPVModel: !!visuals.model3dFPV,
                  sameModelReference: visuals.model3d === visuals.model3dFPV,
                  mapModelLayers: visuals.model3d ? this.getLayerInfo(visuals.model3d) : null,
                  fpvModelLayers: visuals.model3dFPV ? this.getLayerInfo(visuals.model3dFPV) : null,
                  position: object.position,
                  childrenCount: object.children.length
                };
                
                // Check for visual artifacts that might cause "double model" appearance
                analysis.visualArtifacts[monsterId] = this.checkVisualArtifacts(visuals.model3d, object);
                
                // Count 3D models in this monster group
                let modelCount = 0;
                let meshCount = 0;
                object.traverse((child) => {
                  if (child.type === 'Group' && child.userData.originalUrl) {
                    modelCount++;
                  }
                  if (child.isMesh && child.geometry && child.material) {
                    meshCount++;
                  }
                });
                
                analysis.modelCounts[monsterId] = { models: modelCount, meshes: meshCount };
                
                // Detect issues
                if (visuals.model3d && visuals.model3dFPV && visuals.model3d !== visuals.model3dFPV) {
                  analysis.issues.push({
                    type: 'DUPLICATE_MODELS',
                    monsterId: monsterId,
                    message: 'Monster has separate map and FPV models instead of shared model',
                    mapModel: visuals.model3d,
                    fpvModel: visuals.model3dFPV
                  });
                }
                
                if (modelCount > 1) {
                  analysis.issues.push({
                    type: 'MULTIPLE_MODEL_INSTANCES',
                    monsterId: monsterId,
                    message: `Monster has ${modelCount} model instances (should be 1)`,
                    count: modelCount
                  });
                }
                
                // Check for visual artifacts that could cause double appearance
                const artifacts = analysis.visualArtifacts[monsterId];
                if (artifacts.shadowIssues.length > 0) {
                  analysis.issues.push({
                    type: 'SHADOW_ARTIFACTS',
                    monsterId: monsterId,
                    message: 'Shadow configuration issues detected',
                    details: artifacts.shadowIssues
                  });
                }
                
                if (artifacts.duplicateGeometry) {
                  analysis.issues.push({
                    type: 'DUPLICATE_GEOMETRY',
                    monsterId: monsterId,
                    message: 'Duplicate geometry detected - may cause double appearance',
                    count: artifacts.duplicateGeometry.count
                  });
                }
              }
            }
          });
          
          console.log('📊 Monster Model Analysis:', analysis);
          this.generateRecommendations(analysis);
          return analysis;
        }
        
        checkVisualArtifacts(model, parentObject) {
          const artifacts = {
            shadowIssues: [],
            duplicateGeometry: null,
            transparencyIssues: [],
            layerConflicts: []
          };
          
          if (!model) return artifacts;
          
          // Check for shadow issues
          let shadowCasters = 0;
          let shadowReceivers = 0;
          
          // Check for duplicate geometry or materials
          const geometries = new Map();
          const materials = new Map();
          
          model.traverse((child) => {
            if (child.isMesh) {
              if (child.castShadow) shadowCasters++;
              if (child.receiveShadow) shadowReceivers++;
              
              // Check for transparency that might cause double appearance
              if (child.material) {
                if (child.material.transparent && child.material.opacity < 1) {
                  artifacts.transparencyIssues.push({
                    mesh: child.name || 'unnamed',
                    opacity: child.material.opacity
                  });
                }
                
                // Track materials for duplicates
                const matKey = child.material.uuid;
                materials.set(matKey, (materials.get(matKey) || 0) + 1);
              }
              
              // Track geometries for duplicates
              if (child.geometry) {
                const geoKey = child.geometry.uuid;
                geometries.set(geoKey, (geometries.get(geoKey) || 0) + 1);
              }
            }
          });
          
          // Detect unusual shadow configuration
          if (shadowCasters === 0) {
            artifacts.shadowIssues.push('No shadow casters found');
          }
          if (shadowReceivers === 0) {
            artifacts.shadowIssues.push('No shadow receivers found');
          }
          
          // Detect duplicate geometries (could cause visual doubling)
          let maxGeoCount = 0;
          for (const count of geometries.values()) {
            if (count > maxGeoCount) maxGeoCount = count;
          }
          if (maxGeoCount > 1) {
            artifacts.duplicateGeometry = { count: maxGeoCount };
          }
          
          return artifacts;
        }
        
        getLayerInfo(object) {
          if (!object || !object.layers) return null;
          return {
            mapLayer: object.layers.test(0),
            fpvLayer: object.layers.test(1),
            layerMask: object.layers.mask
          };
        }
        
        generateRecommendations(analysis) {
          console.log('💡 FORENSIC RECOMMENDATIONS:');
          
          if (analysis.issues.length === 0) {
            console.log('✅ No monster model duplication issues found');
            console.log('📊 Visual Artifacts Summary:');
            for (const [monsterId, artifacts] of Object.entries(analysis.visualArtifacts)) {
              if (artifacts.transparencyIssues.length > 0) {
                console.log(`   ${monsterId}: ${artifacts.transparencyIssues.length} transparency issues`);
              }
              if (artifacts.duplicateGeometry) {
                console.log(`   ${monsterId}: Duplicate geometry detected (${artifacts.duplicateGeometry.count} instances)`);
              }
            }
            return;
          }
          
          analysis.issues.forEach(issue => {
            switch(issue.type) {
              case 'DUPLICATE_MODELS':
                console.log(`🚨 ${issue.monsterId}: Remove duplicate FPV model, use single model with dual layer visibility`);
                console.log(`   Fix: monsterInstance.layers.set(0); monsterInstance.layers.enable(FPV_MODEL_LAYER);`);
                break;
              case 'MULTIPLE_MODEL_INSTANCES':
                console.log(`🚨 ${issue.monsterId}: ${issue.count} model instances detected, consolidate to single instance`);
                break;
              case 'SHADOW_ARTIFACTS':
                console.log(`🚨 ${issue.monsterId}: Shadow configuration issues - ${issue.details.join(', ')}`);
                console.log(`   Fix: Ensure castShadow=true and receiveShadow=true on meshes`);
                break;
              case 'DUPLICATE_GEOMETRY':
                console.log(`🚨 ${issue.monsterId}: Duplicate geometry causing visual doubling (${issue.count} instances)`);
                console.log(`   Fix: Check for multiple identical meshes in model`);
                break;
            }
          });
          
          // Auto-fix if enabled
          this.autoFixDuplicateModels(analysis.issues);
          this.autoFixVisualArtifacts(analysis.issues);
        }
        
        autoFixDuplicateModels(issues) {
          issues.forEach(issue => {
            if (issue.type === 'DUPLICATE_MODELS') {
              console.log(`🔧 AUTO-FIX: Consolidating models for ${issue.monsterId}`);
              try {
                // Remove the FPV model from scene
                if (issue.fpvModel && issue.fpvModel.parent) {
                  issue.fpvModel.parent.remove(issue.fpvModel);
                }
                // Make map model visible in both layers
                if (issue.mapModel) {
                  issue.mapModel.layers.set(0);
                  issue.mapModel.layers.enable(1);
                }
                console.log(`✅ Fixed duplicate models for ${issue.monsterId}`);
              } catch (e) {
                console.warn(`❌ Failed to fix ${issue.monsterId}:`, e);
              }
            }
          });
        }
        
        autoFixVisualArtifacts(issues) {
          issues.forEach(issue => {
            if (issue.type === 'SHADOW_ARTIFACTS') {
              console.log(`🔧 AUTO-FIX: Fixing shadow artifacts for ${issue.monsterId}`);
              // Find the monster object and fix shadows
              scene.traverse((object) => {
                if ((object.name || object.uuid) === issue.monsterId) {
                  if (object.userData.visuals && object.userData.visuals.model3d) {
                    object.userData.visuals.model3d.traverse((child) => {
                      if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                      }
                    });
                    console.log(`✅ Fixed shadows for ${issue.monsterId}`);
                  }
                }
              });
            }
          });
        }
      }

      // === FORENSIC LLM: CLICK-TO-MOVE ANALYSIS ===
      class ClickToMoveForensicAnalyzer {
        constructor() {
          this.analysisResults = {};
          this.debugMode = true;
        }
        
        analyzeClickToMove() {
          console.log('🔍 FORENSIC ANALYSIS: Click-to-Move System Investigation');
          const analysis = {
            timestamp: Date.now(),
            mapCanvas: null,
            fpvCanvas: null,
            eventListeners: {},
            raycasting: {},
            issues: []
          };
          
          // Analyze map canvas
          if (renderer && renderer.domElement) {
            analysis.mapCanvas = {
              exists: true,
              hasClickListener: this.hasClickListener(renderer.domElement),
              cursor: renderer.domElement.style.cursor,
              dimensions: {
                width: renderer.domElement.width,
                height: renderer.domElement.height
              }
            };
          } else {
            analysis.issues.push({
              type: 'MISSING_MAP_CANVAS',
              message: 'Map renderer or canvas not found'
            });
          }
          
          // Analyze FPV canvas
          if (fpvRenderer && fpvRenderer.domElement) {
            analysis.fpvCanvas = {
              exists: true,
              hasClickListener: this.hasClickListener(fpvRenderer.domElement),
              cursor: fpvRenderer.domElement.style.cursor,
              dimensions: {
                width: fpvRenderer.domElement.width,
                height: fpvRenderer.domElement.height
              }
            };
          }
          
          // Check for click-to-move functions
          analysis.functions = {
            attachClickToMoveMap: typeof attachClickToMoveMap === 'function',
            attachClickToMoveFPV: typeof attachClickToMoveFPV === 'function',
            startAutoMoveTo: typeof startAutoMoveTo === 'function'
          };
          
          // Detect issues
          if (!analysis.functions.attachClickToMoveMap) {
            analysis.issues.push({
              type: 'MISSING_MAP_CLICK_FUNCTION',
              message: 'attachClickToMoveMap function not found'
            });
          }
          
          if (analysis.mapCanvas && !analysis.mapCanvas.hasClickListener) {
            analysis.issues.push({
              type: 'MISSING_MAP_CLICK_LISTENER',
              message: 'Map canvas has no click event listener'
            });
          }
          
          console.log('📊 Click-to-Move Analysis:', analysis);
          this.generateClickToMoveRecommendations(analysis);
          return analysis;
        }
        
        hasClickListener(element) {
          // This is a simplified check - in practice, listeners might not be easily detectable
          return element.onclick !== null || element.style.cursor === 'crosshair';
        }
        
        generateClickToMoveRecommendations(analysis) {
          console.log('💡 CLICK-TO-MOVE RECOMMENDATIONS:');
          
          if (analysis.issues.length === 0) {
            console.log('✅ Click-to-move system appears to be properly configured');
            return;
          }
          
          analysis.issues.forEach(issue => {
            switch(issue.type) {
              case 'MISSING_MAP_CLICK_FUNCTION':
                console.log('🚨 Create attachClickToMoveMap function with raycasting');
                this.implementMapClickToMove();
                break;
              case 'MISSING_MAP_CLICK_LISTENER':
                console.log('🚨 Map canvas missing click listener');
                console.log('   Fix: Call attachClickToMoveMap() during initialization');
                break;
            }
          });
        }
        
        implementMapClickToMove() {
          if (typeof attachClickToMoveMap === 'function') {
            console.log('✅ attachClickToMoveMap already exists');
            return;
          }
          
          console.log('🔧 AUTO-IMPLEMENTING: Map click-to-move functionality');
          
          // Create the function dynamically
          window.attachClickToMoveMap = function() {
            if (!renderer || !renderer.domElement) {
              console.warn('Cannot attach map click - renderer not available');
              return;
            }
            
            const canvas = renderer.domElement;
            canvas.style.cursor = "crosshair";
            canvas.addEventListener("click", (e) => {
              console.log('Map click detected');
              const rect = canvas.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              const mouseVec = new THREE.Vector2(x, y);
              const raycaster = new THREE.Raycaster();
              raycaster.setFromCamera(mouseVec, camera);
              
              // Create a temporary plane at y=0 to intersect with
              const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
              const intersectPoint = new THREE.Vector3();
              raycaster.ray.intersectPlane(plane, intersectPoint);
              
              if (intersectPoint) {
                const tx = Math.round(intersectPoint.x / TILE_SIZE);
                const ty = Math.round(intersectPoint.z / TILE_SIZE);
                
                if (
                  tx >= 0 &&
                  tx < MAP_WIDTH &&
                  ty >= 0 &&
                  ty < MAP_HEIGHT &&
                  map[ty] && map[ty][tx] && map[ty][tx].type === TILE.FLOOR
                ) {
                  console.log(`Map click: Moving to (${tx}, ${ty})`);
                  if (typeof startAutoMoveTo === 'function') {
                    startAutoMoveTo(tx, ty);
                  } else {
                    console.warn('startAutoMoveTo function not available');
                  }
                } else {
                  console.log('Invalid click target');
                }
              }
            });
            console.log('✅ Map click-to-move implemented');
          };
          
          // Auto-attach if possible
          if (renderer && renderer.domElement) {
            window.attachClickToMoveMap();
          }
        }
      }

      // === FORENSIC LLM: TACTICAL CIRCLE & MODEL POSITIONING ANALYZER ===
      class TacticalCircleForensicAnalyzer {
        constructor() {
          this.analysisResults = {};
          this.debugMode = true;
        }
        
        analyzeTacticalPositioning() {
          console.log('🔍 FORENSIC ANALYSIS: Tactical Circle & Model Positioning Investigation');
          const analysis = {
            timestamp: Date.now(),
            playerPositioning: {},
            monsterPositioning: {},
            circleGeometry: {},
            modelBounds: {},
            yOffsetCalculations: {},
            issues: []
          };
          
          // Analyze player positioning
          if (player.object) {
            analysis.playerPositioning = this.analyzeObjectPositioning(player.object, 'PLAYER');
          }
          
          // Analyze monster positioning
          monsters.forEach((monster, index) => {
            if (monster.object) {
              const monsterId = `monster_${index}`;
              analysis.monsterPositioning[monsterId] = this.analyzeObjectPositioning(monster.object, 'MONSTER');
            }
          });
          
          // Analyze fitToHeightAndGround function logic
          analysis.fitToHeightAndGroundLogic = this.analyzeFitToHeightAndGround();
          
          console.log('📊 Tactical Positioning Analysis:', analysis);
          this.generatePositioningRecommendations(analysis);
          return analysis;
        }
        
        analyzeObjectPositioning(object, type) {
          const positioning = {
            objectPosition: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z
            },
            children: [],
            circles: {},
            models: {},
            bounds: null
          };
          
          object.traverse((child) => {
            const childInfo = {
              name: child.name || child.constructor.name,
              type: child.type,
              position: { x: child.position.x, y: child.position.y, z: child.position.z },
              visible: child.visible,
              layers: child.layers ? child.layers.mask : null
            };
            
            // Identify circles
            if (child.geometry && child.geometry.type === 'CircleGeometry') {
              positioning.circles.mainCircle = {
                ...childInfo,
                radius: child.geometry.parameters.radius,
                color: child.material.color.getHexString()
              };
            }
            
            // Identify ring borders
            if (child.geometry && child.geometry.type === 'RingGeometry') {
              const ringType = child.material.color.getHex() === 0xffffff ? 'whiteBorder' : 
                             child.material.color.getHex() === 0xff0000 ? 'hostileBorder' :
                             child.material.color.getHex() === 0x333333 ? 'shadowBorder' : 'unknown';
              positioning.circles[ringType] = {
                ...childInfo,
                innerRadius: child.geometry.parameters.innerRadius,
                outerRadius: child.geometry.parameters.outerRadius,
                color: child.material.color.getHexString()
              };
            }
            
            // Identify 3D models
            if (child.userData && child.userData.originalUrl) {
              positioning.models.main = {
                ...childInfo,
                originalUrl: child.userData.originalUrl,
                scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
                rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
                bounds: this.getObjectBounds(child)
              };
            }
            
            positioning.children.push(childInfo);
          });
          
          // Calculate overall bounds
          positioning.bounds = this.getObjectBounds(object);
          
          return positioning;
        }
        
        getObjectBounds(object) {
          try {
            const box = new THREE.Box3().setFromObject(object);
            return {
              min: { x: box.min.x, y: box.min.y, z: box.min.z },
              max: { x: box.max.x, y: box.max.y, z: box.max.z },
              size: {
                width: box.max.x - box.min.x,
                height: box.max.y - box.min.y,
                depth: box.max.z - box.min.z
              },
              center: {
                x: (box.max.x + box.min.x) / 2,
                y: (box.max.y + box.min.y) / 2,
                z: (box.max.z + box.min.z) / 2
              }
            };
          } catch (e) {
            return { error: e.message };
          }
        }
        
        analyzeFitToHeightAndGround() {
          return {
            purpose: "Scale model to target height and position feet at yOffset above ground",
            currentValues: {
              monsterHeight: "TUNING.models.monsterHeight = " + TUNING.models.monsterHeight,
              currentYOffset: "0.025 (was increased from 0.013)",
              playerYOffset: "0.018",
              tileSize: "TILE_SIZE = " + TILE_SIZE,
              circleRadius: "TILE_SIZE * 0.35 = " + (TILE_SIZE * 0.35)
            },
            logic: [
              "1. Calculate bounding box of model",
              "2. Find largest dimension (dx, dy, dz)",
              "3. Scale = targetHeight / largest dimension",
              "4. Apply scale to model",
              "5. Recalculate bounding box after scaling",
              "6. Set Y position = -minY + yOffset (lift bottom to yOffset height)",
              "7. Circle position.y values: main=0.015, whiteBorder=0.011, hostileBorder=0.013"
            ],
            potentialIssues: [
              "Model scale might be wrong relative to circle",
              "Y offset might be too small for scaled model",
              "Circle Y positions might conflict with model feet",
              "Different scaling between map and FPV views"
            ]
          };
        }
        
        generatePositioningRecommendations(analysis) {
          console.log('💡 TACTICAL POSITIONING RECOMMENDATIONS:');
          
          // Check for buried models
          Object.entries(analysis.monsterPositioning).forEach(([id, positioning]) => {
            if (positioning.models.main && positioning.circles.mainCircle) {
              const modelBottom = positioning.models.main.bounds.min.y;
              const circleTop = positioning.circles.mainCircle.position.y;
              
              if (modelBottom <= circleTop) {
                analysis.issues.push({
                  type: 'MODEL_BURIED',
                  id: id,
                  message: `Model bottom (${modelBottom.toFixed(3)}) is at or below circle top (${circleTop.toFixed(3)})`,
                  modelBottom: modelBottom,
                  circleTop: circleTop,
                  suggestedYOffset: circleTop + 0.05
                });
              }
            }
          });
          
          // Check player positioning
          if (analysis.playerPositioning.models && analysis.playerPositioning.circles.mainCircle) {
            const modelBottom = analysis.playerPositioning.models.main?.bounds.min.y;
            const circleTop = analysis.playerPositioning.circles.mainCircle.position.y;
            
            if (modelBottom !== undefined && modelBottom <= circleTop + 0.01) {
              analysis.issues.push({
                type: 'PLAYER_MODEL_LOW',
                message: `Player model bottom (${modelBottom.toFixed(3)}) is close to circle top (${circleTop.toFixed(3)})`,
                modelBottom: modelBottom,
                circleTop: circleTop
              });
            }
          }
          
          // Generate fixes
          if (analysis.issues.length === 0) {
            console.log('✅ No major positioning issues detected');
          } else {
            analysis.issues.forEach(issue => {
              switch(issue.type) {
                case 'MODEL_BURIED':
                  console.log(`🚨 ${issue.id}: Model buried under circle`);
                  console.log(`   Current: Model bottom=${issue.modelBottom.toFixed(3)}, Circle top=${issue.circleTop.toFixed(3)}`);
                  console.log(`   Fix: Increase Y offset to at least ${issue.suggestedYOffset.toFixed(3)}`);
                  break;
                case 'PLAYER_MODEL_LOW':
                  console.log(`🚨 Player model positioning needs adjustment`);
                  console.log(`   Current: Model bottom=${issue.modelBottom.toFixed(3)}, Circle top=${issue.circleTop.toFixed(3)}`);
                  break;
              }
            });
            
            this.autoFixPositioning(analysis.issues);
          }
        }
        
        autoFixPositioning(issues) {
          console.log('🔧 AUTO-FIX: Adjusting model positioning...');
          
          issues.forEach(issue => {
            if (issue.type === 'MODEL_BURIED') {
              // Calculate better Y offset
              const newYOffset = Math.max(0.05, issue.suggestedYOffset);
              console.log(`💡 Recommended Y offset for monsters: ${newYOffset.toFixed(3)}`);
            }
          });
          
          console.log('💡 SUGGESTED FIXES:');
          console.log('   1. Increase monster Y offset in fitToHeightAndGround to 0.05+');
          console.log('   2. Ensure circle Y positions are lower than model feet');
          console.log('   3. Consider adjusting model scaling for better proportion');
          console.log('   4. Test with both map and FPV views');
        }
      }

      // Initialize forensic analyzers
      window.monsterForensics = new MonsterModelForensicAnalyzer();
      window.clickMoveForensics = new ClickToMoveForensicAnalyzer();
      window.tacticalForensics = new TacticalCircleForensicAnalyzer();
      
      // Global analysis functions
      window.analyzeMonsterModels = () => window.monsterForensics.analyzeMonsterModels();
      window.analyzeClickToMove = () => window.clickMoveForensics.analyzeClickToMove();
      window.analyzeTacticalPositioning = () => window.tacticalForensics.analyzeTacticalPositioning();
      window.runFullForensics = () => {
        console.log('🚀 RUNNING COMPLETE FORENSIC ANALYSIS');
        // Only run forensic auto-analysis if AI/forensics are allowed
        if (typeof MONSTER_AI_DISABLED === 'undefined' || !MONSTER_AI_DISABLED) {
          window.analyzeMonsterModels();
        }
        window.analyzeClickToMove();
        window.analyzeTacticalPositioning();
      };

      let forensicSyncAnalyzer = null;

      // Initialize on game start
      function initializeForensicSystem() {
        if (!forensicSyncAnalyzer) {
          forensicSyncAnalyzer = new ForensicObjectSyncAnalyzer();
          
          // Make it globally accessible for debugging
          window.forensicSync = forensicSyncAnalyzer;
          
          console.log('🔍 Forensic Sync Analyzer initialized and available as window.forensicSync');
          console.log('💡 Press Ctrl+Shift+F for full analysis');
          console.log('💡 Use forensicSync.getStatus() to check sync status');

          // Run a single forced, rate-limited forensic scan at startup to auto-fix obvious sync issues
          try {
            window.forensicSync.scheduleScan && window.forensicSync.scheduleScan(true);
            window.forensicSync.isInitialScan = false;
          } catch (e) { console.warn('Initial forensic scan failed', e); }

          // Lightweight in-browser 'forensic LLM' helper (rule-based)
          window.forensicLLM = {
            name: 'forensic-llm-local',
            version: '0.1',
            lastRun: 0,
            scanConsoleWarnings() {
              // Collect common console warnings from a known set of patterns
              const warnings = [];
              try {
                // Tailwind CDN warning (can't access console history programmatically in browsers),
                // but we can infer from presence of external script tags referencing tailwindcdn
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                scripts.forEach(s => {
                  const src = s.src || '';
                  if (src.includes('cdn.tailwindcss.com')) {
                    warnings.push({ id: 'tailwind-cdn', message: 'Tailwind CDN detected. Use Tailwind as a PostCSS plugin for production.' });
                  }
                });

                // AudioContext user-gesture issues: detect Tone.js or AudioContext usage in window
                if (window.Tone || window.AudioContext || window.webkitAudioContext) {
                  warnings.push({ id: 'audiocontext-gesture', message: 'AudioContext may require a user gesture to start. Ensure resume() is called after user interaction.' });
                }
              } catch (e) {
                console.warn('forensicLLM.scanConsoleWarnings failed', e);
              }
              this.lastRun = Date.now();
              return warnings;
            },

            suggestFixes() {
              const warnings = this.scanConsoleWarnings();
              const fixes = [];
              warnings.forEach(w => {
                if (w.id === 'tailwind-cdn') {
                  fixes.push({ id: 'install-tailwind', title: 'Install Tailwind Locally', detail: 'Install Tailwind as a PostCSS plugin or use the Tailwind CLI and build CSS during your build step. See https://tailwindcss.com/docs/installation' });
                }
                if (w.id === 'audiocontext-gesture') {
                  fixes.push({ id: 'defer-audio', title: 'Defer or resume AudioContext', detail: 'Wrap AudioContext creation/resume in a user gesture handler (e.g., on first user click). Optionally, call audioCtx.resume() after user input.' });
                }
              });

              // Also suggest fixes from forensicSync if there are many sync issues
              try {
                if (window.forensicSync && typeof window.forensicSync.getStatus === 'function') {
                  const st = window.forensicSync.getStatus ? window.forensicSync.getStatus() : null;
                  if (st && st.syncIssues && st.syncIssues > 0) {
                    fixes.push({ id: 'auto-fix-sync', title: 'Auto-fix layer sync issues', detail: 'Attempt to enable missing layers on objects flagged as partial or invisible using the ForensicObjectSyncAnalyzer.' });
                  }
                }
              } catch (e) {}

              return fixes;
            },

            applyFix(fixId) {
              switch (fixId) {
                case 'install-tailwind':
                  console.log('forensicLLM.applyFix: Cannot auto-install Tailwind. See: https://tailwindcss.com/docs/installation');
                  return { applied: false, message: 'Manual action required: install Tailwind as a PostCSS plugin or use the CLI.' };

                case 'defer-audio':
                  // Insert a safe wrapper that attempts to resume AudioContext on first user gesture
                  try {
                    if (!window._forensic_audio_wrapped) {
                      window._forensic_audio_wrapped = true;
                      const resumeAudioOnce = () => {
                        try {
                          const ctx = window.__audio_context__ || (window.AudioContext && new window.AudioContext());
                          if (ctx && typeof ctx.resume === 'function') ctx.resume().catch(()=>{});
                        } catch (e) {}
                        window.removeEventListener('click', resumeAudioOnce);
                        window.removeEventListener('keydown', resumeAudioOnce);
                      };
                      window.addEventListener('click', resumeAudioOnce, { once: true });
                      window.addEventListener('keydown', resumeAudioOnce, { once: true });
                      return { applied: true, message: 'Attached resume() to first user click/keydown.' };
                    }
                    return { applied: false, message: 'Audio resume already wrapped.' };
                  } catch (e) {
                    return { applied: false, message: 'Failed to attach audio resume handler.' };
                  }

                case 'auto-fix-sync':
                  try {
                    if (!window.forensicSync) return { applied: false, message: 'Forensic sync analyzer not available.' };
                    // Collect current sync issues and apply fixes via the existing analyzer
                    const st = window.forensicSync.getStatus ? window.forensicSync.getStatus() : null;
                    // Use a single-pass approach: schedule a forensic scan (rate-limited)
                    window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
                    const scanResults = window.forensicSync.scanAllSceneObjects && window.forensicSync.scanAllSceneObjects();
                    const issues = window.forensicSync.analyzeSyncIssues && window.forensicSync.analyzeSyncIssues(scanResults || []);
                    if (issues && issues.length > 0) {
                      window.forensicSync.applySyncFixes && window.forensicSync.applySyncFixes(issues);
                      return { applied: true, message: `Applied ${issues.length} sync fixes via forensicSync.` };
                    }
                    return { applied: false, message: 'No issues found to fix.' };
                  } catch (e) {
                    return { applied: false, message: 'Auto-fix failed: ' + (e && e.message) };
                  }

                default:
                  return { applied: false, message: 'Unknown fix id' };
              }
            },

            report() {
              const warnings = this.scanConsoleWarnings();
              const fixes = this.suggestFixes();
              const status = {
                warnings,
                suggestedFixes: fixes,
                forensicSyncStatus: (window.forensicSync && window.forensicSync.getStatus) ? window.forensicSync.getStatus() : null
              };
              console.log('🧠 forensicLLM report', status);
              return status;
            }
          };
          console.log('💡 Use forensicSync.performFullAnalysis() for manual analysis');
          console.log('💡 Use window.fixArrows() to immediately hide all monster arrows');
          console.log('💡 Use window.addWhiteBorders() to ensure all monsters have white borders');
        }
      }
      
      // Emergency arrow fix function - globally accessible
      window.fixArrows = function() {
        console.log('🔧 EMERGENCY: Hiding all monster arrows...');
        let arrowsFixed = 0;
        scene.traverse((object) => {
          if (object.userData && object.userData.visuals && object.userData.visuals.arrow) {
            const arrow = object.userData.visuals.arrow;
            if (arrow.visible) {
              arrow.visible = false;
              arrowsFixed++;
              console.log(`Hidden arrow on object: ${object.name || object.uuid}`);
            }
          }
        });
        console.log(`✅ Fixed ${arrowsFixed} visible arrows`);
        return arrowsFixed;
      };
      
      // Emergency white border fix function
      window.addWhiteBorders = function() {
        console.log('🔧 EMERGENCY: Ensuring all monsters have white borders...');
        let bordersAdded = 0;
        scene.traverse((object) => {
          if (object.userData && object.userData.visuals && object.userData.visuals.indicator) {
            // This is a monster object
            if (!object.userData.visuals.whiteBorder) {
              console.log(`Adding missing white border to: ${object.name || object.uuid}`);
              // Create white border like in createMonsterObject
              const circleRadius = TILE_SIZE * 0.35;
              const whiteBorderGeo = new THREE.RingGeometry(
                circleRadius - 0.06,
                circleRadius + 0.06,
                64
              );
              const whiteBorderMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.DoubleSide,
              });
              const whiteBorder = new THREE.Mesh(whiteBorderGeo, whiteBorderMat);
              whiteBorder.rotation.x = -Math.PI / 2;
              whiteBorder.position.y = 0.011;
              whiteBorder.layers.set(0); // Map only
              object.add(whiteBorder);
              object.userData.visuals.whiteBorder = whiteBorder;
              bordersAdded++;
            }
          }
        });
        console.log(`✅ Added ${bordersAdded} white borders`);
        return bordersAdded;
      };

      function createMonsterObject(model) {
        const group = new THREE.Group();
        group.userData.visuals = {};

        // Flashlight removed

        // Orb light: a soft point light that trails the monster; FPV-only so it doesn't wash the tactical map
        const orb = new THREE.PointLight(
          TUNING.lighting.monsterOrb.color,
          TUNING.lighting.monsterOrb.intensity,
          TUNING.lighting.monsterOrb.distance,
          TUNING.lighting.monsterOrb.decay
        );
        orb.position.set(-0.6, WALL_HEIGHT * 0.55, 0.6);
        orb.visible = true; // always on
        orb.layers.set(FPV_MODEL_LAYER);
        group.add(orb);
        group.userData.visuals.orb = orb;
        
        // Hostile face light: dramatic red light above monster face (initially off)
        const hostileLight = new THREE.PointLight(
          0xff3333, // Bright red
          2.0,      // High intensity for drama
          3.0,      // Medium range
          2         // Sharp falloff
        );
        hostileLight.position.set(0, WALL_HEIGHT * 0.8, 0); // Above face
        hostileLight.visible = false; // Initially off
        hostileLight.layers.set(FPV_MODEL_LAYER); // FPV only for dramatic effect
        group.add(hostileLight);
        group.userData.visuals.hostileLight = hostileLight;

        const monsterInstance = model.clone();
        
        // Determine rotation based on model type
        let modelRotation = TUNING.models.yaw.monster;
        const modelUrl = model.userData.originalUrl || '';
        if (modelUrl.includes('Yakuza.Imp.glb') || modelUrl.includes('Yakuza.imp.glb')) {
          modelRotation = TUNING.models.yaw.yakuzaImp;
        }
        
        // Set rotation and scale for map view (larger, shorter)
        monsterInstance.rotation.y = modelRotation;
  fitToHeightAndGround(monsterInstance, TUNING.models.monsterHeight, 0.08); // Elevate feet clearly above tactical circle (increased from 0.09)
        
        // Apply initial scale (will be adjusted per view during rendering)
        const baseScale = TUNING.models.mapViewScale;
        monsterInstance.scale.multiplyScalar(baseScale);
        
        // Store scaling information for view-specific adjustments
        monsterInstance.userData.viewScaling = {
          mapScale: TUNING.models.mapViewScale,
          fpvScale: TUNING.models.fpvViewScale,
          currentScale: baseScale,
          baseScalar: monsterInstance.scale.x // Store the scalar after fitToHeightAndGround
        };
        
        // Single model visible in both map and FPV views
        monsterInstance.layers.set(0); // Map view
        monsterInstance.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV
        monsterInstance.userData.isMapModel = true;
        group.add(monsterInstance);
        
        // Configure shadows and translucent glass material
        monsterInstance.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
            // Apply translucent / holographic material override
            if (node.material) {
               node.material = new THREE.MeshPhysicalMaterial({
                   color: node.material.color || 0x22aa55,
                   map: node.material.map || null,
                   transmission: 0.9,
                   opacity: 1,
                   transparent: true,
                   roughness: 0.1,
                   ior: 1.5,
                   emissive: node.material.emissive || 0x000000,
                   emissiveIntensity: 0.5
               });
            }
          }
        });
        group.userData.visuals.model3d = monsterInstance; // Single model reference
        group.userData.visuals.model3dFPV = monsterInstance; // Same model for both views
        applyMonsterOrbTuning(orb);
        
        // Initialize visuals container for updateMonsterCircle() system
        group.userData.visuals = group.userData.visuals || {};
        return group;
      }

      function createStubMonsterModel(name = 'Stub') {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x8844ff })
        );
        body.position.y = 0.4;
        g.add(body);
        g.name = name;
        return g;
      }

      // Stairs are intentionally disabled for a cleaner look — return empty group
      function createStairsObject() {
        return new THREE.Group();
      }
      function createLootPileObject(visualType = "generic", itemName = "item") {
        const group = new THREE.Group();
        group.userData.lootType = visualType;
        group.userData.itemName = itemName;
        
        let mesh;
        let textLabel;
        
        switch (visualType) {
          case "coin":
          case "gold":
            // Spinning gold coin
            const coinRadius = 0.15;
            const coinThickness = 0.03;
            const coinGeo = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 12);
            const coinMat = new THREE.MeshStandardMaterial({
              color: 0xFFD700,
              metalness: 0.8,
              roughness: 0.2,
              emissive: 0x332200
            });
            mesh = new THREE.Mesh(coinGeo, coinMat);
            mesh.rotation.x = Math.PI / 2; // Lay flat
            mesh.userData.shouldRotate = true; // Mark for animation
            textLabel = "Gold";
            break;
            
          case "food":
            // Food as a rounded sphere
            const foodGeo = new THREE.SphereGeometry(0.12, 8, 6);
            const foodMat = new THREE.MeshStandardMaterial({
              color: 0x8B4513,
              roughness: 0.8,
              metalness: 0.1
            });
            mesh = new THREE.Mesh(foodGeo, foodMat);
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "katana":
          case "weapon":
            // Sword/weapon as white geometric shape
            const weaponGeo = new THREE.BoxGeometry(0.05, 0.25, 0.05);
            const weaponMat = new THREE.MeshStandardMaterial({
              color: 0xC0C0C0,
              metalness: 0.9,
              roughness: 0.1
            });
            mesh = new THREE.Mesh(weaponGeo, weaponMat);
            mesh.rotation.z = Math.PI / 4; // Angled
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "shield":
          case "armor":
            // Shield/armor as white disc
            const shieldGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8);
            const shieldMat = new THREE.MeshStandardMaterial({
              color: 0xE0E0E0,
              metalness: 0.6,
              roughness: 0.3
            });
            mesh = new THREE.Mesh(shieldGeo, shieldMat);
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "potion":
            // Potion as small cylinder
            const potionGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
            const potionMat = new THREE.MeshStandardMaterial({
              color: 0x8B00FF,
              transparent: true,
              opacity: 0.8,
              emissive: 0x2200AA
            });
            mesh = new THREE.Mesh(potionGeo, potionMat);
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "scroll":
            // Scroll as flat rectangle
            const scrollGeo = new THREE.PlaneGeometry(0.15, 0.2);
            const scrollMat = new THREE.MeshStandardMaterial({
              color: 0xF5DEB3,
              roughness: 0.9,
              metalness: 0.0
            });
            mesh = new THREE.Mesh(scrollGeo, scrollMat);
            mesh.rotation.x = -Math.PI / 2; // Lay flat
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "ring":
            // Ring as small torus
            const ringGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 12);
            const ringMat = new THREE.MeshStandardMaterial({
              color: 0xFFD700,
              metalness: 0.9,
              roughness: 0.1
            });
            mesh = new THREE.Mesh(ringGeo, ringMat);
            mesh.rotation.x = Math.PI / 2; // Lay flat
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "amulet":
            // Amulet as small gem
            const amuletGeo = new THREE.OctahedronGeometry(0.08);
            const amuletMat = new THREE.MeshStandardMaterial({
              color: 0x00FF00,
              metalness: 0.3,
              roughness: 0.2,
              emissive: 0x002200
            });
            mesh = new THREE.Mesh(amuletGeo, amuletMat);
            mesh.userData.shouldRotate = true;
            textLabel = itemName;
            break;
            
          case "key":
            // Key as small rod with head
            const keyGeo = new THREE.BoxGeometry(0.04, 0.15, 0.04);
            const keyMat = new THREE.MeshStandardMaterial({
              color: 0xFFD700,
              metalness: 0.8,
              roughness: 0.2
            });
            mesh = new THREE.Mesh(keyGeo, keyMat);
            mesh.userData.shouldRotate = true;
            textLabel = "Key";
            break;
            
          default:
            // Generic loot pile
            const genericGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const genericMat = new THREE.MeshStandardMaterial({
              color: 0x8B4513,
              roughness: 0.8
            });
            mesh = new THREE.Mesh(genericGeo, genericMat);
            mesh.userData.shouldRotate = true;
            textLabel = "Loot";
            break;
        }
        
  // Position mesh floating 3 feet above ground (~1 world unit = 1 foot) and scale 200%
  mesh.position.y = 1.0; // 3 feet above ground
  mesh.scale.setScalar(2.0); // 200% larger
        mesh.layers.set(0);
        mesh.layers.enable(FPV_MODEL_LAYER);
        group.add(mesh);
        
        // Add text label above the item (1 foot above item = 4 feet total)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        // Black rounded background with white text (4px corner radius)
        function roundRect(ctx, x, y, w, h, r) {
          const radius = r || 4;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + w, y, x + w, y + h, radius);
          ctx.arcTo(x + w, y + h, x, y + h, radius);
          ctx.arcTo(x, y + h, x, y, radius);
          ctx.arcTo(x, y, x + w, y, radius);
          ctx.closePath();
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        // draw semi-opaque black rounded rectangle
        context.fillStyle = 'rgba(0,0,0,0.95)';
        roundRect(context, 8, 8, canvas.width - 16, canvas.height - 16, 4);
        context.fill();
        // draw white label text
        context.fillStyle = 'white';
        context.font = 'bold 56px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(textLabel, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.05,
          color: 0xffffff,
          side: THREE.DoubleSide
        });
        
        const labelGeometry = new THREE.PlaneGeometry(1.6, 0.4);
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.y = 2.0; // 1 foot above the 3-foot floating item = 4 feet total
        // Billboard: face toward FPV camera on each frame
        labelMesh.userData.billboardToFPV = true;
        // Visible in both views
        labelMesh.layers.set(0);
        labelMesh.layers.enable(FPV_MODEL_LAYER);
        group.add(labelMesh);
        
        // Store reference to meshes for animation and billboarding
        group.userData.mainMesh = mesh;
        group.userData.labelMesh = labelMesh;
        
        return group;
      }

      // Create red X marker for defeated monsters (NetHack style)
      function createDeadMonsterMark(x, y) {
        const group = new THREE.Group();

        // Create red X using two thin rectangles
        const xSize = TILE_SIZE * 0.6;
        const thickness = 0.08;
        const xGeo1 = new THREE.PlaneGeometry(xSize, thickness);
        const xGeo2 = new THREE.PlaneGeometry(xSize, thickness);
        const xMat = new THREE.MeshBasicMaterial({
          color: 0xff0000, // Red X for corpses
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1.0,
        });

        const x1 = new THREE.Mesh(xGeo1, xMat);
        const x2 = new THREE.Mesh(xGeo2, xMat);

        // Position and rotate to form X
        x1.rotation.x = -Math.PI / 2;
        x1.rotation.z = Math.PI / 4;
        x1.position.y = 0.005;

        x2.rotation.x = -Math.PI / 2;
        x2.rotation.z = -Math.PI / 4;
        x2.position.y = 0.005;

        group.add(x1);
        group.add(x2);
        group.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);

        return group;
      }

      // Update monster visual indicators based on hostility state and other statuses
      function updateMonsterIndicators(monster) {
        if (!monster.object || !monster.object.userData.visuals) return;

        const indicator = monster.object.userData.visuals.indicator;
        const border = monster.object.userData.visuals.border;
        const hostileLight = monster.object.userData.visuals.hostileLight;
  const whiteBorder = monster.object.userData.visuals.whiteBorder;
  const shadowBorder = monster.object.userData.visuals.shadowBorder;
  const searchIndicator = monster.object.userData.visuals.searchIndicator;
        
        // Ensure white border is always visible for all statuses as requested
        if (whiteBorder) {
          whiteBorder.visible = true;
          whiteBorder.material.color.setHex(0xFFFFFF); // Force white color for all states
          whiteBorder.renderOrder = 990; // High render order to always show up
        }
        
        // Ensure neumorphic shadows are visible for all statuses
        if (shadowBorder) {
          shadowBorder.visible = true;
        }
        
        // Check if monster is gambling (this takes precedence over hostility)
        const isGambling = monster.state === "GAMING";
        
        if (indicator && border) {
          if (isGambling) {
            // Gold/yellow circle for gaming
            indicator.material.color.setHex(0xFFD700);
            border.material.color.setHex(0x000000);
            border.visible = true;
            if (hostileLight) hostileLight.visible = false;
            // Gambling is not hostile: ensure normal depth behavior
            indicator.material.depthTest = true;
            border.material.depthTest = true;
            if (whiteBorder) whiteBorder.material.depthTest = true;
            if (shadowBorder) shadowBorder.material.depthTest = true;
            if (searchIndicator) searchIndicator.material.depthTest = true;
            indicator.renderOrder = 0;
            border.renderOrder = 0;
            if (whiteBorder) whiteBorder.renderOrder = 0;
            if (shadowBorder) shadowBorder.renderOrder = 0;
            if (searchIndicator) searchIndicator.renderOrder = 0;
          } else {
            // Normal hostility states
            switch (monster.hostileState) {
              case "INACTIVE":
                indicator.material.color.setHex(0x000000); // Black
                border.visible = false;
                if (hostileLight) hostileLight.visible = false; // Turn off hostile light
                // Occluded by walls in map view
                indicator.material.depthTest = true;
                border.material.depthTest = true;
                if (whiteBorder) whiteBorder.material.depthTest = true;
                if (shadowBorder) shadowBorder.material.depthTest = true;
                if (searchIndicator) searchIndicator.material.depthTest = true;
                indicator.renderOrder = 0;
                border.renderOrder = 0;
                if (whiteBorder) whiteBorder.renderOrder = 0;
                if (shadowBorder) shadowBorder.renderOrder = 0;
                if (searchIndicator) searchIndicator.renderOrder = 0;
                break;
              case "HOSTILE":
                indicator.material.color.setHex(0xff0000); // Red
                border.material.color.setHex(0xffffff); // White border
                border.visible = true;
                if (hostileLight) hostileLight.visible = true; // Turn on hostile face light
                // Hostile shows through walls in map view
                indicator.material.depthTest = false;
                border.material.depthTest = false;
                indicator.renderOrder = 999;
                border.renderOrder = 999;
                
                if (whiteBorder) { 
                  whiteBorder.material.depthTest = false; 
                  whiteBorder.renderOrder = 998;
                }
                if (shadowBorder) { 
                  shadowBorder.material.depthTest = false; 
                  shadowBorder.renderOrder = 997;
                }
                break;
              case "ALLY":
                indicator.material.color.setHex(0x00c878);
                border.material.color.setHex(0xffffff);
                border.visible = true;
                if (hostileLight) hostileLight.visible = false;
                indicator.material.depthTest = true;
                border.material.depthTest = true;
                if (whiteBorder) whiteBorder.material.depthTest = true;
                if (shadowBorder) shadowBorder.material.depthTest = true;
                indicator.renderOrder = 0;
                border.renderOrder = 0;
                if (whiteBorder) whiteBorder.renderOrder = 0;
                if (shadowBorder) shadowBorder.renderOrder = 0;
                break;
              case "SEARCHING":
                indicator.material.color.setHex(0xff8800); // Orange
                border.material.color.setHex(0xffffff); // White border
                border.visible = true;
                if (hostileLight) hostileLight.visible = false;
                indicator.material.depthTest = true;
                border.material.depthTest = true;
                if (whiteBorder) whiteBorder.material.depthTest = true;
                if (shadowBorder) shadowBorder.material.depthTest = true;
                if (searchIndicator) searchIndicator.material.depthTest = true;
                indicator.renderOrder = 0;
                border.renderOrder = 0;
                if (whiteBorder) whiteBorder.renderOrder = 0;
                if (shadowBorder) shadowBorder.renderOrder = 0;
                if (searchIndicator) searchIndicator.renderOrder = 0;
                break;
            }
          }
        }
      }

      // Make all monsters in room hostile when one is attacked
      function makeRoomMonstersHostile(roomId) {
        monsters.forEach((monster) => {
          if (!monster || monster.health <= 0) return;
          if (monster.spawnRoomId === roomId && monster.aiState !== MONSTER_STATES.HOSTILE && !monster.isAlly) {
            applyMonsterState(monster, MONSTER_STATES.HOSTILE);
          }
        });
      }

      function disposeSceneObjects() {
        // Remove all registered game objects safely
        try {
          const keys = Array.from(gameObjects.keys());
          keys.forEach(k => removeGameObject(k));
        } catch (e) { console.warn('disposeSceneObjects: failed to remove gameObjects', e); }
        if (wallInstancedMesh) {
          scene.remove(wallInstancedMesh);
          if (wallInstancedMesh.geometry) wallInstancedMesh.geometry.dispose();
          wallInstancedMesh = null;
        }
        
        // Clean up map walls too
        scene.children.forEach(child => {
          if (child.userData && child.userData.isMapWalls) {
            scene.remove(child);
            if (child.geometry) child.geometry.dispose();
          }
        });
        
        // DON'T dispose of monster tuning object (preserve it during dungeon regeneration)
        if (monsterObject) {
          console.log('🛡️ Protecting monster tuning object from disposal');
        }
        
        if (floorMesh) {
          scene.remove(floorMesh);
          floorMesh.geometry.dispose();
          floorMesh = null;
        }
        if (fpvFloorMesh) {
          scene.remove(fpvFloorMesh);
          if (fpvFloorMesh.geometry) fpvFloorMesh.geometry.dispose();
          fpvFloorMesh = null;
        }
        if (ceilingMesh) {
          scene.remove(ceilingMesh);
          ceilingMesh.geometry.dispose();
          ceilingMesh = null;
        }
        // Clean up room overlays
        const roomOverlaysGroup = scene.getObjectByName('roomOverlays');
        if (roomOverlaysGroup) {
          scene.remove(roomOverlaysGroup);
          roomOverlaysGroup.traverse((n) => {
            if (n.geometry) n.geometry.dispose();
            if (n.material) n.material.dispose();
          });
        }

        // Clean up tile labels
        if (tileLabelsGroup) {
          removeGameObject('tileLabelsGroup');
          tileLabelsGroup = null;
        }
      }

      // --- Rogue/NetHack-style Dungeon Generator (clean, proximate rooms + L-corridors) ---
      function generateNextGenDungeon() {
        disposeSceneObjects();
        // generation retry state: do not allow corridors to run alongside room walls
        const MAX_GEN_ATTEMPTS = 6;
        generateNextGenDungeon._tries = generateNextGenDungeon._tries || 0;
        // Safely remove monster objects via registry when possible
        monsters.forEach((m) => {
          try {
            // Attempt keyed removal if we stored a key on the monster
            if (m._gameKey) {
              removeGameObject(m._gameKey);
            } else if (m.object) {
              // Fallback: remove from parent if attached
              if (m.object.parent) m.object.parent.remove(m.object);
            }
          } catch (e) {}
        });
        monsters = [];

        // initialize map to walls
        map = Array.from({ length: MAP_HEIGHT }, () =>
          Array.from({ length: MAP_WIDTH }, () => ({ type: TILE.WALL, roomId: null }))
        );

        const ROOM_MIN_W = 4, ROOM_MAX_W = 8;
        const ROOM_MIN_H = 4, ROOM_MAX_H = 8; // Made more square (was 3-6, now 4-8)
        const ROOM_ATTEMPTS = 200;
        const MAX_ROOM_PROXIMITY = 4; // rooms must be within 4 tiles (Manhattan) of an existing room
        const rooms = [];

        function manhattanRectGap(a, b) {
          const ax2 = a.x + a.w - 1, ay2 = a.y + a.h - 1;
          const bx2 = b.x + b.w - 1, by2 = b.y + b.h - 1;
          let dx = 0;
          if (ax2 < b.x) dx = b.x - ax2 - 1;
          else if (bx2 < a.x) dx = a.x - bx2 - 1;
          let dy = 0;
          if (ay2 < b.y) dy = b.y - ay2 - 1;
          else if (by2 < a.y) dy = a.y - by2 - 1;
          return Math.max(0, dx) + Math.max(0, dy);
        }

        let idCounter = 1;

        // Force R1 to be our starting hallway (2 tiles wide, 7 tiles long) in the center
        const startW = 3, startH = 7;
        const startX = Math.floor(MAP_WIDTH / 2) - 1;
        const startY = Math.floor(MAP_HEIGHT / 2) - Math.floor(startH / 2);
        rooms.push({ x: startX, y: startY, w: startW, h: startH, id: `R${idCounter++}` });

        for (let i = 0; i < ROOM_ATTEMPTS && rooms.length < 16; i++) {
          const w = ROOM_MIN_W + Math.floor(Math.random() * (ROOM_MAX_W - ROOM_MIN_W + 1));
          const h = ROOM_MIN_H + Math.floor(Math.random() * (ROOM_MAX_H - ROOM_MIN_H + 1));
          const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
          const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));
          const room = { x, y, w, h, id: `R${idCounter++}` };

          // reject if overlapping existing rooms (with a 1-tile pad)
          let overlap = false;
          for (const r of rooms) {
            if (room.x < r.x + r.w + 1 && room.x + room.w + 1 > r.x && room.y < r.y + r.h + 1 && room.y + room.h + 1 > r.y) {
              overlap = true;
              break;
            }
          }
          if (overlap) continue;

          // proximity rule: except for first room, require at least one existing room within MAX_ROOM_PROXIMITY
          if (rooms.length > 0) {
            let close = false;
            for (const r of rooms) {
              if (manhattanRectGap(room, r) <= MAX_ROOM_PROXIMITY) {
                close = true; break;
              }
            }
            if (!close) continue;
          }

          rooms.push(room);
        }

        // If generator failed to place any rooms due to strict proximity rules,
        // ensure there's at least one central room so the game has a valid
        // starting location and the map contract (tile.type + tile.roomId) holds.
        if (rooms.length === 0) {
          const cw = Math.min(ROOM_MAX_W, Math.max(ROOM_MIN_W, 6));
          const ch = Math.min(ROOM_MAX_H, Math.max(ROOM_MIN_H, 4));
          const cx = Math.floor((MAP_WIDTH - cw) / 2);
          const cy = Math.floor((MAP_HEIGHT - ch) / 2);
          rooms.push({ x: cx, y: cy, w: cw, h: ch, id: `R${idCounter++}` });
        }

        // carve rooms
        for (const r of rooms) {
          for (let yy = r.y; yy < r.y + r.h; yy++) {
            for (let xx = r.x; xx < r.x + r.w; xx++) {
              map[yy][xx].type = TILE.FLOOR;
              map[yy][xx].roomId = r.id;
            }
          }
        }

        // No strict entry point: corridors can abut any perimeter tile of a room.
        // This restores robust connectivity and classic roguelike behavior.

        // helper: L-shaped carve between anchors. Respects per-room designated entry points
        // Corridors are only allowed to abut room walls at the room.entry tile or at tiles marked secretDoor.
        function carveL(a, b) {
          // compute anchor points: pick edge nearest to target (classic logic)
          function roomAnchor(r, tx, ty) {
            // if r is a tiny point (w/h==1), just use x/y
            if (!r.w || !r.h || (r.w === 1 && r.h === 1)) return { x: Math.floor(r.x), y: Math.floor(r.y) };
            const cx = Math.floor(r.x + r.w / 2);
            const cy = Math.floor(r.y + r.h / 2);
            // direction towards target
            const dx = tx - cx, dy = ty - cy;
            if (Math.abs(dx) > Math.abs(dy)) {
              // anchor on left or right edge
              const ax = dx > 0 ? (r.x + r.w) : (r.x - 1);
              const ay = cy;
              return { x: ax, y: ay };
            } else {
              // anchor on top or bottom edge
              ay = dy > 0 ? (r.y + r.h) : (r.y - 1);
              ax = cx;
              return { x: ax, y: ay };
            }
          }

          const tx = (b.x !== undefined) ? Math.floor(b.x + (b.w ? b.w/2 : 0)) : Math.floor(b.x);
          const ty = (b.y !== undefined) ? Math.floor(b.y + (b.h ? b.h/2 : 0)) : Math.floor(b.y);
          const aAnchor = roomAnchor(a, tx, ty);
          const bAnchor = (b.w && b.h) ? roomAnchor(b, aAnchor.x, aAnchor.y) : { x: tx, y: ty };

          const cx1 = aAnchor.x; const cy1 = aAnchor.y;
          const cx2 = bAnchor.x; const cy2 = bAnchor.y;

          // helper: carve a single step of corridor if it's not inside a room
          function carveStep(x, y) {
            if (!map[y] || !map[y][x]) return;
            const t = map[y][x];
            if (t.roomId && t.roomId !== 'corridor') return; // don't overwrite room tiles
            t.type = TILE.FLOOR; t.roomId = 'corridor';
          }

          // carve horizontal then vertical (L-shaped) fully, avoiding overwriting room tiles
          for (let x = Math.min(cx1, cx2); x <= Math.max(cx1, cx2); x++) {
            carveStep(x, cy1);
          }
          for (let y = Math.min(cy1, cy2); y <= Math.max(cy1, cy2); y++) {
            carveStep(cx2, y);
          }

          // ensure the immediate cell adjacent to room floors is also carved so adjacency test succeeds
          const ensureAdj = (r) => {
            const insideX = Math.min(Math.max(r.x, 0), MAP_WIDTH-1);
            const insideY = Math.min(Math.max(r.y, 0), MAP_HEIGHT-1);
            // scan perimeter and ensure the corridor tile adjacent to perimeter is floor
            for (let yy = r.y - 1; yy <= r.y + r.h; yy++) {
              for (let xx = r.x - 1; xx <= r.x + r.w; xx++) {
                if (yy < 0 || xx < 0 || yy >= MAP_HEIGHT || xx >= MAP_WIDTH) continue;
                if (xx >= r.x && xx < r.x + r.w && yy >= r.y && yy < r.y + r.h) continue; // skip inner room
                // if this is corridor and adjacent to room tile, leave it
                const adj = map[yy][xx];
                if (adj && adj.type === TILE.FLOOR && adj.roomId === 'corridor') return;
              }
            }
            // carve a direct door at the anchor point
            const ax = Math.min(Math.max(cx1,0), MAP_WIDTH-1);
            const ay = Math.min(Math.max(cy1,0), MAP_HEIGHT-1);
            if (map[ay] && map[ay][ax]) { map[ay][ax].type = TILE.FLOOR; map[ay][ax].roomId = 'corridor'; }
          };
          try { ensureAdj(a); } catch (e) {}
          try { if (b && b.w && b.h) ensureAdj(b); } catch (e) {}
        }

        // connect rooms by walking nearest-center MST style but ensure every room connects to at least one other
        if (rooms.length > 1) {
          const centers = rooms.map(r => ({ x: Math.floor(r.x + r.w/2), y: Math.floor(r.y + r.h/2) }));
          const connected = new Set([0]);
          while (connected.size < centers.length) {
            let bestA = -1, bestB = -1, bestD = Infinity;
            for (const a of connected) {
              for (let b = 0; b < centers.length; b++) {
                if (connected.has(b)) continue;
                const dx = centers[a].x - centers[b].x; const dy = centers[a].y - centers[b].y;
                const d = dx*dx + dy*dy;
                if (d < bestD) { bestD = d; bestA = a; bestB = b; }
              }
            }
            if (bestA === -1) break;
            carveL(rooms[bestA], rooms[bestB]);
            connected.add(bestB);
          }
        }

        // final pass: ensure isolated rooms are explicitly connected to nearest corridor or room
        const DUNGEON_DEBUG = false;
        for (const r of rooms) {
          let hasAdj = false;
          for (let y = r.y; y < r.y + r.h && !hasAdj; y++) {
            for (let x = r.x; x < r.x + r.w && !hasAdj; x++) {
              const adj = [ [x-1,y],[x+1,y],[x,y-1],[x,y+1] ];
              for (const [ax,ay] of adj) {
                if (ax>=0 && ay>=0 && ay<MAP_HEIGHT && ax<MAP_WIDTH) {
                  const t = map[ay][ax];
                  if (t && t.type === TILE.FLOOR && t.roomId === 'corridor') { hasAdj = true; break; }
                }
              }
            }
          }
          if (!hasAdj) {
            // find nearest corridor tile first
            let best = null; let bestDist = Infinity;
            const cx = Math.floor(r.x + r.w/2); const cy = Math.floor(r.y + r.h/2);
            for (let y=0;y<MAP_HEIGHT;y++) for (let x=0;x<MAP_WIDTH;x++) {
              const t = map[y][x];
              if (!t) continue;
              if (t.type === TILE.FLOOR && t.roomId === 'corridor') {
                const d = Math.abs(cx-x)+Math.abs(cy-y);
                if (d<bestDist) { bestDist=d; best={x,y}; }
              }
            }
            if (best) {
              if (DUNGEON_DEBUG) console.log('Connecting', r.id, 'to corridor at', best, 'dist', bestDist);
              carveL(r, { x: best.x, y: best.y, w:1, h:1 });
            } else {
              // no corridor tiles exist (rare). Connect to nearest other room edge instead.
              let bestRoom = null; let bestRoomDist = Infinity;
              for (const o of rooms) {
                if (o === r) continue;
                const ocx = Math.floor(o.x + o.w/2); const ocy = Math.floor(o.y + o.h/2);
                const d = Math.abs(cx-ocx)+Math.abs(cy-ocy);
                if (d < bestRoomDist) { bestRoomDist = d; bestRoom = o; }
              }
              if (bestRoom) {
                if (DUNGEON_DEBUG) console.log('No corridor tiles; connecting', r.id, 'to room', bestRoom.id);
                carveL(r, bestRoom);
              } else {
                if (DUNGEON_DEBUG) console.warn('Unable to find connection target for room', r.id);
              }
            }
          }
        }

        // Post-generation: verify hallway adjacency rules — every room should have
        // at most one corridor-adjacent perimeter tile (i.e., a single door).
        function roomCorridorAdjCount(room) {
          let count = 0;
          for (let yy = room.y - 1; yy <= room.y + room.h; yy++) {
            for (let xx = room.x - 1; xx <= room.x + room.w; xx++) {
              if (yy < 0 || xx < 0 || yy >= MAP_HEIGHT || xx >= MAP_WIDTH) continue;
              if (xx >= room.x && xx < room.x + room.w && yy >= room.y && yy < room.y + room.h) continue; // skip inner
              const t = map[yy][xx];
              if (t && t.type === TILE.FLOOR && t.roomId === 'corridor') count++;
            }
          }
          return count;
        }

        let adjacencyViolation = false;
        // No adjacency violation regeneration: allow multiple corridor connections per room for robust connectivity.

  // successful generation: reset retry counter
  generateNextGenDungeon._tries = 0;
  // place player in first room center
        if (rooms.length) {
          const first = rooms[0];
          player.x = Math.floor(first.x + first.w/2);
          player.y = Math.floor(first.y + first.h/2);
          player.currentTile = map[player.y][player.x];
        }

        // place a shrine in the farthest room
        if (rooms.length) {
          const sx = player.x, sy = player.y;
          let far = null, farD = -1;
          for (const r of rooms) {
            const cx = Math.floor(r.x + r.w/2); const cy = Math.floor(r.y + r.h/2);
            const d = Math.abs(cx-sx)+Math.abs(cy-sy);
            if (d>farD) { farD=d; far={cx,cy}; }
          }
          if (far) placeShrineAt(far.cx, far.cy);
        }

        // 🐉 Spawn monsters in rooms (except player's starting room)
        console.log('🐉 Spawning monsters in', rooms.length, 'rooms');
        for (let i = 1; i < rooms.length; i++) { // Skip first room (player starts there)
          const room = rooms[i];
          if (Math.random() < 0.7) { // 70% chance for each room to have a monster
            console.log('🐉 Spawning monster in room', room.id);
            spawnMonsterInRoom(room, null);
          }
        }
        console.log('🐉 Total monsters spawned:', monsters.length);

        drawMap();
        setRoomTag(map[player.y]?.[player.x]?.roomId || 'corridor');
        updateViewSwap();
        updateUI();
      }

      // Runtime verification helper — call from browser console as `verifyDungeon()`
      function verifyDungeon() {
        if (!map || !map.length) { console.warn('No map present'); return false; }
        const rooms = new Map();
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            const t = map[y][x];
            if (!t || !t.roomId) continue;
            if (t.roomId === 'corridor') continue;
            if (!rooms.has(t.roomId)) rooms.set(t.roomId, []);
            rooms.get(t.roomId).push({ x, y });
          }
        }

        const centers = [];
        for (const [id, tiles] of rooms.entries()) {
          const sx = tiles.reduce((s, p) => s + p.x, 0) / tiles.length;
          const sy = tiles.reduce((s, p) => s + p.y, 0) / tiles.length;
          centers.push({ id, x: Math.floor(sx), y: Math.floor(sy) });
        }

        console.log('verifyDungeon: found', centers.length, 'rooms');

        // Check proximity rule
        const failures = [];
        for (let i = 0; i < centers.length; i++) {
          let ok = false;
          for (let j = 0; j < centers.length; j++) {
            if (i === j) continue;
            const d = Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
            if (d <= 4) { ok = true; break; }
          }
          if (!ok) failures.push(centers[i]);
        }

        if (failures.length === 0) console.log('Proximity: PASS — every room has a neighbor within 4 tiles');
        else console.warn('Proximity: FAIL — rooms without close neighbors:', failures);

        // Connectivity check: BFS from first room center to reach every other room center via floor tiles
        if (centers.length > 0) {
          const start = centers[0];
          const targetSet = new Set(centers.slice(1).map(c => `${c.x},${c.y}`));
          const seen = new Set();
          const q = [{ x: start.x, y: start.y }];
          seen.add(`${start.x},${start.y}`);
          const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
          while (q.length && targetSet.size) {
            const cur = q.shift();
            for (const [dx,dy] of dirs) {
              const nx = cur.x + dx, ny = cur.y + dy;
              if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
              const key = `${nx},${ny}`;
              if (seen.has(key)) continue;
              seen.add(key);
              if (map[ny][nx].type !== TILE.FLOOR) continue;
              if (targetSet.has(key)) targetSet.delete(key);
              q.push({ x: nx, y: ny });
            }
          }
          if (targetSet.size === 0) console.log('Connectivity: PASS — all room centers reachable via floor tiles');
          else console.warn('Connectivity: FAIL — unreachable centers remain:', Array.from(targetSet));
        }

        return { centers, proximityFailures: failures };
      }

      // --- Micro-objective: Simple Shrine granting a small buff ---
      function createShrineObject() {
        const g = new THREE.Group();
        g.name = 'shrine';
        // Base plinth
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.45, 0.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x303040, metalness: 0.2, roughness: 0.8 })
        );
        base.position.y = 0.1;
        g.add(base);
        // Upright crystal
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.2),
          new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x224466, metalness: 0.1, roughness: 0.3 })
        );
        crystal.position.y = 0.45;
        crystal.userData.shouldRotate = true;
        g.add(crystal);
        // Label
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128; canvas.height = 32;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#cde8ff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Shrine', 64, 16);
        const tex = new THREE.CanvasTexture(canvas);
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(0.6, 0.15),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
        );
        label.position.y = 0.75;
        g.add(label);
        
        g.userData.mainMesh = crystal;
        g.layers.set(0);
        g.layers.enable(FPV_MODEL_LAYER);
        g.userData.isShrine = true;
        return g;
      }

      function placeShrineAt(x, y) {
        const shrine = createShrineObject();
        shrine.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
        addGameObject(`shrine_${x}_${y}`, shrine);
      }

      function isOverlapping(room, existingRooms) {
        for (const other of existingRooms) {
          if (
            room.x < other.x + other.w + 4 &&
            room.x + room.w + 4 > other.x &&
            room.y < other.y + other.h + 4 &&
            room.y + room.h + 4 > other.y
          )
            return true;
        }
        return false;
      }
      function carveHallway(x1, y1, x2, y2, id) {
        let x = x1,
          y = y1;
        const points = [];
        while (x !== x2 || y !== y2) {
          points.push({ x, y });
          if (x !== x2 && (Math.abs(x2 - x) > Math.abs(y2 - y) || y === y2))
            x += Math.sign(x2 - x);
          else if (y !== y2) y += Math.sign(y2 - y);
        }
        points.push({ x, y });
        for (const p of points) {
          if (map[p.y] && map[p.y][p.x]) {
            map[p.y][p.x].type = TILE.FLOOR;
            map[p.y][p.x].roomId = id;
          }
        }
      }
      
      // === NetHack Core Systems ===
      
      // NetHack-style dice rolling
      function rollDice(diceString) {
        // Parse dice notation like "1d4", "2d6+1", "1d8-1"
        const match = diceString.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return 1; // Default fallback
        
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;
        
        let total = 0;
        for (let i = 0; i < count; i++) {
          total += Math.floor(Math.random() * sides) + 1;
        }
        return Math.max(1, total + modifier);
      }
      
      // NetHack hunger system (disabled: no starvation or hunger effects)
      function processHunger() {
        // Maintain turn counter for any other systems, but do not change hunger/health
        player.turnCount++;
        return;
      }
      
      // NetHack item identification
      function identifyItem(item) {
        const itemKey = `${item.type}_${item.name}`;
        if (!player.identifiedItems.has(itemKey)) {
          player.identifiedItems.add(itemKey);
          logMessage(`This ${item.name} is now identified!`, "#00FFFF");
          return true;
        }
        return false;
      }
      
      function getItemDisplayName(item) {
        const itemKey = `${item.type}_${item.name}`;
        if (player.identifiedItems.has(itemKey) || item.type === "gold" || item.type === "food") {
          return item.name;
        }
        
        // Return unidentified names for unknown items
        switch (item.type) {
          case "potion": return "unknown potion";
          case "scroll": return "mysterious scroll";
          case "ring": return "unknown ring";
          case "amulet": return "strange amulet";
          default: return item.name;
        }
      }
      
      // NetHack search mechanics
      function searchArea() {
        const searchKey = `${player.x}_${player.y}`;
        player.searchCount++;
        
        // Higher chance of finding things with repeated searches
        const searchChance = Math.min(0.8, 0.1 + (player.searchCount * 0.1));
        
        if (Math.random() < searchChance) {
          // Chance to find hidden items or doors
          if (Math.random() < 0.3) {
            // Generate a small random item
            const foundItems = [{
              type: "gold",
              amount: Math.floor(Math.random() * 10) + 1,
              visual: "coin"
            }];
            
            foundItems.forEach((item, index) => {
              const lootObj = createLootPileObject(item.visual || item.type, item.name || item.type);
              lootObj.position.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
              lootObj.userData = { items: [item] };
              addGameObject(`search_loot_${player.x}_${player.y}_${index}`, lootObj);
            });
            
            logMessage("You found something hidden!", "#FFD700");
            player.searchCount = 0; // Reset search count after finding something
            return true;
          }
        }
        
        logMessage("You search the area but find nothing.", "#A0A0A0");
        return false;
      }
      
      // NetHack equipment management
      function canEquipItem(item) {
        switch (item.type) {
          case "weapon": return !item.weaponType || item.weaponType !== "two_handed_sword" || !player.equipment.ring;
          case "armor": return true;
          case "helmet": return true;
          case "boots": return true;
          case "gauntlets": return true;
          case "ring": return true;
          case "amulet": return true;
          default: return false;
        }
      }
      
      function equipItem(item) {
        if (!canEquipItem(item)) {
          logMessage("You cannot equip that item.", "#FF0000");
          return false;
        }
        
        let equipSlot = null;
        switch (item.type) {
          case "weapon": equipSlot = "weapon"; break;
          case "armor": equipSlot = "armor"; break;
          case "helmet": equipSlot = "helmet"; break;
          case "boots": equipSlot = "boots"; break;
          case "gauntlets": equipSlot = "gauntlets"; break;
          case "ring": equipSlot = "ring"; break;
          case "amulet": equipSlot = "amulet"; break;
        }
        
        if (equipSlot) {
          // Unequip current item if any
          if (player.equipment[equipSlot]) {
            player.inventory.push(player.equipment[equipSlot]);
            logMessage(`You unequip the ${player.equipment[equipSlot].name}.`, "#FFFF00");
          }
          
          // Equip new item
          player.equipment[equipSlot] = item;
          logMessage(`You equip the ${item.name}.`, "#00FF00");
          
          // Apply item effects
          updatePlayerStats();
          return true;
        }
        
        return false;
      }
      
      function updatePlayerStats() {
        // Reset to base stats then apply equipment bonuses
        player.ac = 10; // Base AC
        player.attack = 1; // Base attack
        
        // Apply equipment bonuses
        Object.values(player.equipment).forEach(item => {
          if (item) {
            if (item.ac) player.ac -= item.ac; // Lower AC is better in NetHack
            if (item.damage) {
              // Convert damage dice to attack bonus
              const damageBonus = Math.floor(rollDice(item.damage) / 2);
              player.attack += damageBonus;
            }
            if (item.enchantment) {
              player.attack += item.enchantment;
              if (item.type === "armor") player.ac -= item.enchantment;
            }
          }
        });
        
        // Ensure AC doesn't go below -10 or above 20
        player.ac = Math.max(-10, Math.min(20, player.ac));
      }
      
      // NetHack status effects
      function addStatusEffect(effect, duration, power = 1) {
        player.statusEffects.set(effect, {
          duration: duration,
          power: power,
          startTurn: player.turnCount
        });
        logMessage(`You feel ${effect}!`, "#FF00FF");
      }
      
      function processStatusEffects() {
        for (const [effect, data] of player.statusEffects.entries()) {
          data.duration--;
          
          if (data.duration <= 0) {
            player.statusEffects.delete(effect);
            logMessage(`The ${effect} effect wears off.`, "#FFFF00");
          } else {
            // Apply ongoing effects
            switch (effect) {
              case "regeneration":
                if (player.turnCount % 5 === 0) {
                  player.health = Math.min(player.maxHealth, player.health + data.power);
                }
                break;
              case "confusion":
                // Movement might be reversed (handled in movement functions)
                break;
            }
          }
        }
      }
      
      // Turn-based validation system
      class TurnBasedForensics {
        constructor() {
          this.turnLog = [];
          this.lastActionTime = Date.now();
          this.actionCount = 0;
          this.realTimeDetected = false;
        }
        
        logAction(action, details = {}) {
          const now = Date.now();
          const timeSinceLastAction = now - this.lastActionTime;
          
          this.turnLog.push({
            action: action,
            timestamp: now,
            timeDelta: timeSinceLastAction,
            turnNumber: player.turnCount,
            details: details
          });
          
          // Detect real-time behavior (actions happening too frequently)
          if (timeSinceLastAction < 50 && this.actionCount > 0) {
            this.realTimeDetected = true;
            console.warn(`🚨 FORENSIC ALERT: Real-time behavior detected! Action "${action}" occurred ${timeSinceLastAction}ms after previous action.`);
          }
          
          this.lastActionTime = now;
          this.actionCount++;
          
          // Keep only last 100 actions
          if (this.turnLog.length > 100) {
            this.turnLog.shift();
          }
        }
        
        validateTurnBased() {
          const recentActions = this.turnLog.slice(-10);
          const rapidActions = recentActions.filter(action => action.timeDelta < 100);
          
          if (rapidActions.length > 3) {
            console.error("🚨 TURN-BASED VIOLATION: Too many rapid actions detected!");
            return false;
          }
          
          return true;
        }
        
        getReport() {
          return {
            totalActions: this.actionCount,
            realTimeDetected: this.realTimeDetected,
            recentActions: this.turnLog.slice(-10),
            isValid: this.validateTurnBased()
          };
        }
      }
      
      // Initialize forensic system
      const forensics = new TurnBasedForensics();
      
      // (removed duplicate older variant of spawnMonsterInRoom)
      function spawnMonsterInRoom(room, dropsKey) {
        // Try up to N times to find a safe tile inside the room that is not
        // occupied by another monster and is not the player's starting tile
        // (or immediately adjacent). This prevents the player from spawning
        // on top of a monster on load.
        for (let i = 0; i < 100; i++) {
          const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - 2));
          const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
          // Reject tiles that are the player's tile or within 1 tile of player
          const tooCloseToPlayer =
            typeof player.x === 'number' &&
            typeof player.y === 'number' &&
            Math.abs(x - player.x) <= 1 &&
            Math.abs(y - player.y) <= 1;
          if (
            map[y] &&
            map[y][x] &&
            map[y][x].roomId === room.id &&
            !monsters.some((m) => m.x === x && m.y === y) &&
            !tooCloseToPlayer
          ) {
            let model;
            if (room.id === 'R1') {
                model = monsterModels.find(m => m.name && m.name.toLowerCase().includes('goblin')) || monsterModels[0];
            } else {
                if (Math.random() < 0.4) {
                    model = monsterModels.find(m => m.name && m.name.toLowerCase().includes('imp')) || monsterModels[0];
                } else {
                    model = monsterModels[Math.floor(Math.random() * monsterModels.length)];
                }
            }
            
            // NetHack-style monster stats with level-aware easing (make level 1 noticeably easier)
            const monsterLevel = Math.max(1, dungeonLevel + Math.floor(Math.random() * 3) - 1);
            let health, attack;
            if (dungeonLevel <= 1) {
              health = rollDice("1d3");      // Lower starting health
              attack = 1;                     // Minimal base attack at level 1
            } else {
              // Gentle scaling with level
              health = rollDice("1d3") + Math.floor((dungeonLevel - 1) / 2);
              attack = 1 + Math.floor((dungeonLevel - 1) / 3); // grows slowly
            }
            
          const monsterObj = createMonsterObject(model);
          monsterObj.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
          const mkey = `monster_${room.id}_${x}_${y}_${Date.now()}`;
          addGameObject(mkey, monsterObj);
            const monster = {
              x,
              y,
              level: monsterLevel,
              health,
              maxHealth: health,
              attack,
              object: monsterObj,
              spawnPos: { x, y },
              spawnRoomId: room.id,
              dropsKey,
              state: "IDLE",
              hostileState: "INACTIVE", // INACTIVE, HOSTILE, SEARCHING
              facingAngle: Math.random() * 2 * Math.PI,
              path: [],
              searchTurnsLeft: 0,
              lastKnownPlayerPos: null,
              attackCooldown: 0,
              dex: dungeonLevel <= 1 ? 6 : 8,
              level: dungeonLevel,
              _gameKey: mkey,
            };
            monster.name =
              model.name || (Math.random() < 0.5 ? "Goblin" : "Imp");
            monsters.push(monster);
            return;
          }
        }
      }

      function createOrnateDoorway() {
        const doorX = Math.floor(MAP_WIDTH / 2);
  const doorY = MAP_HEIGHT - 1;
        
        // Create doorway frame with Japanese/oriental design
        const doorGroup = new THREE.Group();
        
        // Main door frame (dark wood)
        const frameGeometry = new THREE.BoxGeometry(TILE_SIZE * 1.2, WALL_HEIGHT * 1.1, 0.2);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x2d1810 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 0.55, (doorY - 0.5) * TILE_SIZE);
        frame.castShadow = true;
        frame.receiveShadow = true;
        doorGroup.add(frame);
        
        // Ornate pillars on sides
        const pillarGeometry = new THREE.BoxGeometry(0.3, WALL_HEIGHT * 1.2, 0.3);
        const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        
        const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  leftPillar.position.set(doorX * TILE_SIZE - TILE_SIZE * 0.5, WALL_HEIGHT * 0.6, (doorY - 0.5) * TILE_SIZE);
        leftPillar.castShadow = true;
        doorGroup.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  rightPillar.position.set(doorX * TILE_SIZE + TILE_SIZE * 0.5, WALL_HEIGHT * 0.6, (doorY - 0.5) * TILE_SIZE);
        rightPillar.castShadow = true;
        doorGroup.add(rightPillar);
        
        // Decorative torii-style top piece
        const topGeometry = new THREE.BoxGeometry(TILE_SIZE * 1.4, 0.2, 0.4);
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const topPiece = new THREE.Mesh(topGeometry, topMaterial);
  topPiece.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 1.1, (doorY - 0.5) * TILE_SIZE);
        topPiece.castShadow = true;
        doorGroup.add(topPiece);
        
        // Lanterns on pillars
        const lanternGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
        const lanternMaterial = new THREE.MeshLambertMaterial({ 
          color: 0xffaa00, 
          emissive: 0x221100 
        });
        
        const leftLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
  leftLantern.position.set(doorX * TILE_SIZE - TILE_SIZE * 0.5, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
        doorGroup.add(leftLantern);
        
        const rightLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
  rightLantern.position.set(doorX * TILE_SIZE + TILE_SIZE * 0.5, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
        doorGroup.add(rightLantern);
        
        // Add subtle glow from lanterns
        const lanternLight = new THREE.PointLight(0xffaa44, 0.5, 5);
  lanternLight.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
        lanternLight.castShadow = true;
        doorGroup.add(lanternLight);
        
        // Set layers for visibility
        doorGroup.traverse((child) => {
          if (child.isMesh || child.isLight) {
            child.layers.set(0); // Map view
            child.layers.enable(FPV_MODEL_LAYER); // Also FPV view
          }
        });
        
  // Use helper to keep scene <-> registry in sync
  addGameObject(`ornate_doorway_${doorX}_${doorY}`, doorGroup);
      }

      function drawMap() {
        const floorGeometries = [],
          ceilingGeometries = [];
        let wallCount = 0;
        
        // Helper function to determine if a wall is in empty space (not adjacent to any floor)
        function isWallInEmptySpace(wallX, wallY) {
          // Check all 8 adjacent tiles for any floor tiles
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue; // Skip the wall tile itself
              const checkX = wallX + dx;
              const checkY = wallY + dy;
              
              // Check bounds
              if (checkX >= 0 && checkX < MAP_WIDTH && checkY >= 0 && checkY < MAP_HEIGHT) {
                const adjacentTile = map[checkY][checkX];
                if (adjacentTile && adjacentTile.type === TILE.FLOOR) {
                  return false; // Found adjacent floor, so this is not an empty space wall
                }
              }
            }
          }
          return true; // No adjacent floor tiles found, this is an empty space wall
        }
        
        // Create two different wall geometries - one for FPV, one for map view (25% shorter)
        const fpvWallHeight = WALL_HEIGHT;
        const mapWallHeight = WALL_HEIGHT * 0.75; // 25% shorter for map view
        
        const fpvWallGeometry = new THREE.BoxGeometry(
          TILE_SIZE,
          fpvWallHeight,
          TILE_SIZE
        );
        
        const mapWallGeometry = new THREE.BoxGeometry(
          TILE_SIZE * 0.95,
          mapWallHeight,
          TILE_SIZE * 0.95
        );
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x].type === TILE.WALL) {
              wallCount++;
            } else if (map[y][x].type !== null) {
              const floorGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
              floorGeo.rotateX(-Math.PI / 2);
              floorGeo.translate(x * TILE_SIZE, 0, y * TILE_SIZE);
              floorGeometries.push(floorGeo);
              
              // Create dark wood rafter ceiling for FPV only (at full wall height)
              const ceilingGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
              ceilingGeo.rotateX(Math.PI / 2);
              ceilingGeo.translate(x * TILE_SIZE, fpvWallHeight, y * TILE_SIZE);
              ceilingGeometries.push(
                ceilingGeo
              ); /* Stairs creation intentionally skipped */
            }
          }
        }
        if (floorGeometries.length > 0) {
          const mergedFloors =
            THREE.BufferGeometryUtils.mergeBufferGeometries(floorGeometries);
          // Map view floor (layer 0) uses flat material matching FPV base texture/color
          floorMesh = new THREE.Mesh(mergedFloors, mapFloorMaterial);
          floorMesh.receiveShadow = true; // Enable shadow receiving for cinematic effect
          floorMesh.castShadow = false;
          floorMesh.layers.set(0); // Default layer for map
          scene.add(floorMesh);

          // Separate FPV floor using PBR material; render only on FPV layer
          fpvFloorMesh = new THREE.Mesh(mergedFloors.clone(), floorMaterial);
          fpvFloorMesh.receiveShadow = true;
          fpvFloorMesh.castShadow = false;
          fpvFloorMesh.layers.set(FPV_MODEL_LAYER);
          scene.add(fpvFloorMesh);

          // ADD TILE LABELS FOR DEBUGGING (R = Room, H = Hallway/Corridor)
          if (DEBUG_TILE_LABELS) addTileLabels();
        }
  if (ceilingGeometries.length > 0) {
          const mergedCeilings =
            THREE.BufferGeometryUtils.mergeBufferGeometries(ceilingGeometries);
          ceilingMesh = new THREE.Mesh(mergedCeilings, rafterCeilingMaterial);
          ceilingMesh.layers.set(0); // Default layer for map
          ceilingMesh.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV
          scene.add(ceilingMesh);
        }
  if (wallCount > 0) {
          // Create different wall groups: room walls and empty space walls
          let roomWallCounts = [0, 0, 0, 0];
          let emptySpaceWallCount = 0;
          let totalRoomWallCount = 0;
          
          // Count walls by type and assign deterministic shoji variant
          for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
              if (map[y][x].type === TILE.WALL) {
                const isEmptySpaceWall = isWallInEmptySpace(x, y);
                if (isEmptySpaceWall) {
                  emptySpaceWallCount++;
                } else {
                  // deterministic hash for wall texture
                  let hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453;
                  // Make grid (variant 1) the most common
                  let r = Math.floor(hash * 100) % 100;
                  let variant = 1; // grid defaults
                  if (r < 25) variant = 0; // plain
                  else if (r > 80 && r < 90) variant = 2; // red sun
                  else if (r >= 90) variant = 3; // slats
                  
                  map[y][x].shojiVariant = variant;
                  // random chance for "half panel" wall (increased frequency for rooms)
                  let isRoom = !isEmptySpaceWall;
                  map[y][x].isHalfPanel = (Math.floor(hash * 777) % 100) < (isRoom ? 35 : 20);
                  // Chance for "empty" shoji frame (approx 10% of half panels)
                  map[y][x].isEmptyShoji = map[y][x].isHalfPanel && (Math.floor(hash * 999) % 100 < 40);
                  
                  roomWallCounts[variant]++;
                  totalRoomWallCount++;
                }
              }
            }
          }
          
          // Materials for MAP VIEW room walls: now matched to FPV dynamic Shoji styles
          const toyWallTopMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x2c180e, clearcoat: 0.6, clearcoatRoughness: 0.15, roughness: 0.4, metalness: 0.15 
          });
          
          // InstancedMesh materials for Map View walls (matched to FPV variants)
          const mapDojoMaterialsMap = [
             new THREE.MeshStandardMaterial({ map: createDungeonWallTexture('plain'), roughness: 0.6, metalness: 0.15 }),
             new THREE.MeshStandardMaterial({ map: createDungeonWallTexture('grid'), roughness: 0.6, metalness: 0.15 }),
             toyWallTopMat, // top
             new THREE.MeshStandardMaterial({ map: createDungeonWallTexture('sun'), roughness: 0.6, metalness: 0.15 }),
             new THREE.MeshStandardMaterial({ map: createDungeonWallTexture('slats'), roughness: 0.6, metalness: 0.15 }),
             new THREE.MeshStandardMaterial({ map: createDungeonWallTexture('empty'), roughness: 0.6, metalness: 0.15, transparent: true })
          ];
          
          // Materials for empty space walls
          const emptySpaceWallMaterials = [
            emptySpaceWallSideMaterial, emptySpaceWallSideMaterial, emptySpaceWallTopMaterial,
            emptySpaceWallSideMaterial, emptySpaceWallSideMaterial, emptySpaceWallSideMaterial,
          ];
          
          const dummy = new THREE.Object3D();
          
          // FPV Room Walls become a group holding 4 InstancedMeshes
          wallInstancedMesh = new THREE.Group();
          wallInstancedMesh.userData = { isWallGroup: true, hiddenInstances: new Map(), subMeshes: [] };
          const fpvWallMeshes = [];
          
          if (totalRoomWallCount > 0) {
            
            const styles = ['plain', 'grid', 'sun', 'slats', 'empty'];
            for(let i=0; i<5; i++) {
                const count = (i === 4) ? totalRoomWallCount : roomWallCounts[i]; // i=4 for empty, count calculated below
                if (count === 0 && i < 4) continue; 
                const tex = createDungeonWallTexture(styles[i]);
                const mat = new THREE.MeshStandardMaterial({ 
                    map: tex, 
                    roughness: 0.6, 
                    metalness: 0.15, 
                    envMapIntensity: 0.8,
                    transparent: (i === 4),
                    side: THREE.DoubleSide
                });
                const fpvMesh = new THREE.InstancedMesh(fpvWallGeometry, [mat, mat, mat, mat, mat, mat], count > 0 ? count : 1);
                fpvMesh.receiveShadow = true;
                fpvMesh.castShadow = true;
                fpvMesh.layers.set(FPV_MODEL_LAYER);
                fpvMesh.userData = { variantId: i };
                wallInstancedMesh.add(fpvMesh);
                wallInstancedMesh.userData.subMeshes.push(fpvMesh);
                fpvWallMeshes.push({ mesh: fpvMesh, index: 0, variantId: i });
            }
            
            // Map room walls also use matched physical materials
            const mapStyles = ['plain', 'grid', 'sun', 'slats', 'empty'];
            const mapWallGroups = [];
            for(let i=0; i<5; i++) {
               const tex = createDungeonWallTexture(mapStyles[i]);
               const sideMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.1, transparent: i===4 });
               const materials = [sideMat, sideMat, toyWallTopMat, sideMat, sideMat, sideMat];
               const mMesh = new THREE.InstancedMesh(mapWallGeometry, materials, totalRoomWallCount);
               mMesh.layers.set(0);
               scene.add(mMesh);
               mapWallGroups.push({ mesh: mMesh, index: 0, variantId: i });
            }            
            for (let y = 0; y < MAP_HEIGHT; y++) {
              for (let x = 0; x < MAP_WIDTH; x++) {
                if (map[y][x].type === TILE.WALL && !isWallInEmptySpace(x, y)) {
                  let variant = map[y][x].shojiVariant;
                  if (map[y][x].isEmptyShoji) variant = 4; // Use empty variant
                  
                  let isHalf = !!map[y][x].isHalfPanel;
                  let targetMesh = fpvWallMeshes.find(m => m.variantId === variant);
                  let targetMapGroup = mapWallGroups.find(m => m.variantId === variant);
                  
                  // FPV room walls
                  dummy.position.set(x * TILE_SIZE, isHalf ? (fpvWallHeight * 0.25) : (fpvWallHeight / 2), y * TILE_SIZE);
                  dummy.scale.set(1, isHalf ? 0.5 : 1, 1);
                  dummy.updateMatrix();
                  if (targetMesh) {
                    targetMesh.mesh.setMatrixAt(targetMesh.index, dummy.matrix);
                    targetMesh.index++;
                  }
                  
                  // Map room walls
                  dummy.position.set(x * TILE_SIZE, isHalf ? (mapWallHeight * 0.25) : (mapWallHeight / 2), y * TILE_SIZE);
                  dummy.scale.set(1, isHalf ? 0.5 : 1, 1);
                  dummy.updateMatrix();
                  if (targetMapGroup) {
                    targetMapGroup.mesh.setMatrixAt(targetMapGroup.index, dummy.matrix);
                    targetMapGroup.index++;
                  }
                }
              }
            }
            
            scene.add(wallInstancedMesh); 
            mapWallGroups.forEach(g => {
              if (g.index > 0) {
                 g.mesh.count = g.index;
                 g.mesh.instanceMatrix.needsUpdate = true;
                 g.mesh.userData.isMapWalls = true;
              } else {
                 scene.remove(g.mesh);
              }
            });
          }
          
          // Create empty space walls if any exist
          if (emptySpaceWallCount > 0) {
            // Create FPV empty space walls (full height) - only visible to FPV camera
            const fpvEmptyWallInstancedMesh = new THREE.InstancedMesh(
              fpvWallGeometry,
              emptySpaceWallMaterials,
              emptySpaceWallCount
            );
            fpvEmptyWallInstancedMesh.receiveShadow = true;
            fpvEmptyWallInstancedMesh.castShadow = true;
            fpvEmptyWallInstancedMesh.layers.set(FPV_MODEL_LAYER); // Only visible in FPV
            
            // Create map empty space walls (75% height) - only visible to map camera  
            const mapEmptyWallInstancedMesh = new THREE.InstancedMesh(
              mapWallGeometry,
              emptySpaceWallMaterials,
              emptySpaceWallCount
            );
            // Map empty walls: no shadows for speed/clarity
            mapEmptyWallInstancedMesh.receiveShadow = false;
            mapEmptyWallInstancedMesh.castShadow = false;
            mapEmptyWallInstancedMesh.layers.set(0); // Only visible in map view
            
            let emptyWallIndex = 0;
            for (let y = 0; y < MAP_HEIGHT; y++) {
              for (let x = 0; x < MAP_WIDTH; x++) {
                if (map[y][x].type === TILE.WALL && isWallInEmptySpace(x, y)) {
                  // FPV empty space walls at full height
                  dummy.position.set(
                    x * TILE_SIZE,
                    fpvWallHeight / 2,
                    y * TILE_SIZE
                  );
                  dummy.updateMatrix();
                  fpvEmptyWallInstancedMesh.setMatrixAt(emptyWallIndex, dummy.matrix);
                  
                  // Map empty space walls at reduced height
                  dummy.position.set(
                    x * TILE_SIZE,
                    mapWallHeight / 2,
                    y * TILE_SIZE
                  );
                  dummy.updateMatrix();
                  mapEmptyWallInstancedMesh.setMatrixAt(emptyWallIndex, dummy.matrix);
                  
                  emptyWallIndex++;
                }
              }
            }
            
            scene.add(fpvEmptyWallInstancedMesh);
            scene.add(mapEmptyWallInstancedMesh);
            
            // If no room walls exist, use empty walls as primary reference
            if (totalRoomWallCount === 0) {
              wallInstancedMesh = new THREE.Group();
              wallInstancedMesh.userData = { isWallGroup: true, hiddenInstances: new Map(), subMeshes: [] };
              fpvEmptyWallInstancedMesh.userData = { variantId: 'empty' };
              wallInstancedMesh.add(fpvEmptyWallInstancedMesh);
              wallInstancedMesh.userData.subMeshes.push(fpvEmptyWallInstancedMesh);
              scene.add(wallInstancedMesh);
            } else {
              fpvEmptyWallInstancedMesh.userData = { variantId: 'empty' };
              wallInstancedMesh.add(fpvEmptyWallInstancedMesh);
              wallInstancedMesh.userData.subMeshes.push(fpvEmptyWallInstancedMesh);
            }
            mapEmptyWallInstancedMesh.userData.isMapWalls = true;
          }
        }
        fpvWallGeometry.dispose();
        mapWallGeometry.dispose();
        
        // Create ornate doorway at entrance
        createOrnateDoorway();
        
        if (!player.object) {
          player.object = createPlayerObject();
          scene.add(player.object);
        }
        player.object.position.set(
          player.x * TILE_SIZE,
          0,
          player.y * TILE_SIZE
        );
        // ensure player model meshes cast shadows and feet sit on the floor
        player.object.traverse((n) => {
          if (n.isMesh) n.castShadow = true;
        });
        try {
          const pbbox = new THREE.Box3().setFromObject(player.object);
          const pMinY = pbbox.min.y;
          if (pMinY < 0) player.object.position.y += -pMinY;
        } catch (e) {
          /* ignore if bounding box fails */
        }

        // === CREATE MONSTER FOR TUNING ===
        console.log('Creating monster - Player position:', player.x, player.y);
        // createMonsterForTuning(); // Moved to after dungeon generation

        playerTargetRotation.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          player.rotationY
        );
        player.object.quaternion.copy(playerTargetRotation);
        // Ensure initial map camera targets player tile
        mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
        // Apply top-down pitch for better room visibility
        const pitch = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
        const dist = zoomLevel;
        camera.position.set(
          mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
          dist * Math.sin(pitch),
          mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
        );
        camera.lookAt(mapCameraTarget);

        // Debug: Log camera setup
        console.log("Camera setup after dungeon generation:", {
          player_position: [player.x, player.y],
          mapCameraTarget: mapCameraTarget,
          camera_position: camera.position,
          pitch: pitch,
          dist: dist,
          cameraAngle: cameraAngle,
          zoomLevel: zoomLevel,
        });

        // Initialize simple room/hallway discovery instead of fog of war
        initRoomDiscovery();
        updateRoomVisibility();

        // Add a test cube to ensure scene is rendering (made invisible)
        const testGeometry = new THREE.BoxGeometry(2, 2, 2);
        const testMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
        const testCube = new THREE.Mesh(testGeometry, testMaterial);
        testCube.position.set(
          player.x * TILE_SIZE,
          1,
          player.y * TILE_SIZE + 3
        );
        scene.add(testCube);
        console.log("Added test cube at:", testCube.position);

        // Force camera to look at player position for debugging
        focusMapOnPlayer();

        updateCamera();
        
        // Trigger forensic scan after dungeon generation to ensure object sync
        setTimeout(() => {
          if (window.forensicSync) {
            console.log('🔍 Triggering forensic scan after dungeon generation');
            window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
          }
        }, 200);
      }

      // Force map camera to focus on player - useful for debugging
      function focusMapOnPlayer() {
        console.log("Focusing map on player at:", [player.x, player.y]);
        mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
        
        const pitch = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
        const dist = zoomLevel;
        
        camera.position.set(
          mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
          dist * Math.sin(pitch),
          mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
        );
        camera.lookAt(mapCameraTarget);
        
        console.log("Camera focused at position:", camera.position, "looking at:", mapCameraTarget);
      }

      function initRoomDiscovery() {
        // Simple discovery system - track discovered rooms and create overlay meshes
        discoveredRooms = new Set();
        
        // Create dimming overlays for each room/corridor
        createRoomOverlays();
        
        // Player starts in a discovered room
        const startTile = map[player.y][player.x];
        if (startTile && startTile.roomId) {
          discoveredRooms.add(startTile.roomId);
          updateRoomOverlayVisibility(startTile.roomId, true);
        }
      }

      function createRoomOverlays() {
        // No room overlays: fog-of-war disabled globally for the map view
        // Keep a stub to preserve call sites
        if (scene.getObjectByName('roomOverlays')) {
          const og = scene.getObjectByName('roomOverlays');
          scene.remove(og);
        }
      }

      function updateRoomOverlayVisibility(roomId, discovered) {
        // No-op: overlays are not used
      }

      function updateRoomVisibility() {
        // Check if player has entered a new room/hallway
        const currentTile = map[player.y][player.x];
        if (currentTile && currentTile.roomId === 'corridor') {
          // Always consider corridor discovered
          discoveredRooms.add('corridor');
        }
        if (currentTile && currentTile.roomId && !discoveredRooms.has(currentTile.roomId)) {
          discoveredRooms.add(currentTile.roomId);
          updateRoomOverlayVisibility(currentTile.roomId, true);
        }
      }

      // hasLineOfSight function kept for monster AI line of sight checking
      function hasLineOfSight(x0, y0, x1, y1) {
        // Ensure coordinates are integers for tile-based raycast
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        
        // Same tile - always has line of sight
        if (x0 === x1 && y0 === y1) return true;
        
        // Bresenham grid raycast; walls block
        let dx = Math.abs(x1 - x0),
          sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0),
          sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        let x = x0,
          y = y0;
        
        while (true) {
          // Don't check starting position - monsters can see from their own tile
          if (!(x === x0 && y === y0)) {
            // Check if current tile is out of bounds or a wall
            if (!map[y] || !map[y][x] || map[y][x].type === TILE.WALL) {
              return false;
            }
          }
          
          // Reached destination
          if (x === x1 && y === y1) return true;
          
          let e2 = 2 * err;
          if (e2 >= dy) {
            if (x === x1) break;
            err += dy;
            x += sx;
          }
          if (e2 <= dx) {
            if (y === y1) break;
            err += dx;
            y += sy;
          }
        }
        return false;
      }

      // --- Mapview click-and-drag panning ---
      (function enableMapPanning(){
        if (!mapCanvasWrapper) return;
        let panStart = null; // world position when drag starts
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); // ground y=0

        const screenToGround = (clientX, clientY) => {
          const rect = mapCanvasWrapper.getBoundingClientRect();
          ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
          raycaster.setFromCamera(ndc, camera);
          const pt = new THREE.Vector3();
          raycaster.ray.intersectPlane(plane, pt);
          return pt;
        };

        mapCanvasWrapper.addEventListener('mousedown', (e)=>{
          if (e.button !== 0) return; // left only
          const pt = screenToGround(e.clientX, e.clientY);
          if (!pt) return;
          isPanning = true;
          userHasPanned = true;
          panStart = pt;
        });

        window.addEventListener('mousemove', (e)=>{
          if (!isPanning || !panStart) return;
          const pt = screenToGround(e.clientX, e.clientY);
          if (!pt) return;
          // compute delta and update panOffset so that camera target shifts opposite to drag
          const delta = new THREE.Vector3().subVectors(panStart, pt);
          panOffset.add(delta);
          updateCamera(true);
          panStart = pt;
        });

        window.addEventListener('mouseup', (e)=>{
          if (e.button === 0) {
            isPanning = false;
            panStart = null;
          }
        });
      })();

      function updateCamera(isManual = false) {
        if (isManual) {
          userHasPanned = true;
          isMapCameraAnimating = false;
        }

        // INSTANT rendering - no smooth zoom transitions
        zoomLevel = desiredZoomLevel; // INSTANT: No smooth transitions

        if (isMapCameraAnimating) {
          camera.position.copy(mapCameraPosition); // INSTANT: No lerp animation
          camera.lookAt(mapCameraTarget);
          isMapCameraAnimating = false; // INSTANT: End animation immediately
        } else if (userHasPanned) {
          const targetPosition = new THREE.Vector3(
            player.x * TILE_SIZE,
            0,
            player.y * TILE_SIZE
          ).add(panOffset);
          const pitch2 = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
          const d2 = zoomLevel;
          camera.position.x =
            targetPosition.x + d2 * Math.sin(cameraAngle) * Math.cos(pitch2);
          camera.position.y = d2 * Math.sin(pitch2);
          camera.position.z =
            targetPosition.z + d2 * Math.cos(cameraAngle) * Math.cos(pitch2);
          camera.lookAt(targetPosition);
        } else {
          // Centered camera uses smoothed zoomLevel
          pitch2 = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
          camera.position.set(
            mapCameraTarget.x +
              zoomLevel * Math.sin(cameraAngle) * Math.cos(pitch2),
            zoomLevel * Math.sin(pitch2),
            mapCameraTarget.z +
              zoomLevel * Math.cos(cameraAngle) * Math.cos(pitch2)
          );
          camera.lookAt(mapCameraTarget);
        }

        // FPV camera
        const playerPos = player.object.position.clone();
        let cameraHeight = normalCameraHeight; // Default: 6 feet above head
        let lookAtTarget;
        
        // Combat camera mode
        if (isInCombat && combatTarget) {
          // Add extra height for combat camera (3 feet higher)
          cameraHeight += TUNING.combat.camera.heightOffset;
          
          // Smooth transition for combat camera
          const elapsed = performance.now() - combatCameraTransitionStart;
          const progress = Math.min(elapsed / TUNING.combat.camera.transitionDuration, 1);
          const easeProgress = 0.5 * (1 - Math.cos(Math.PI * progress)); // Smooth easing
          
          if (progress < 1) {
            // Interpolate between normal and combat height
            cameraHeight = normalCameraHeight + (TUNING.combat.camera.heightOffset * easeProgress);
          }
          
          // Look directly at the monster model during combat
          const combatTargetPos = combatTarget.object ? combatTarget.object.position : 
                                  new THREE.Vector3(combatTarget.x * TILE_SIZE, TUNING.models.monsterHeight / 2, combatTarget.y * TILE_SIZE);
          lookAtTarget = combatTargetPos.clone();
          lookAtTarget.y = TUNING.models.monsterHeight / 2; // Look at monster's center
        } else {
          // Normal camera: look at tile in front of player
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.object.quaternion);
          lookAtTarget = playerPos.clone().add(forward.multiplyScalar(TILE_SIZE));
          lookAtTarget.y = 0; // Ground level to see the full tile
        }
        
        // Calculate camera position
        if (isInCombat && combatTarget) {
          // Combat camera: stay directly above player, yaw to look down at monster
          const cameraPos = playerPos.clone().add(new THREE.Vector3(0, cameraHeight, 0)); // Directly above player
          fpvCamera.position.copy(cameraPos);
        } else {
          // Check global selfie mode state
          if (typeof window.fpvSelfieMode === 'undefined') window.fpvSelfieMode = true;
          
          if (window.fpvSelfieMode) {
             // Selfie mode: 1 tile in front of player, looking back
             const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.object.quaternion);
             cameraPos = playerPos.clone()
               .add(forward.multiplyScalar(TILE_SIZE * 0.8)) // Just in front
               .add(new THREE.Vector3(0, cameraHeight * 0.9, 0)); // Slightly lower to see face better
             lookAtTarget = playerPos.clone().add(new THREE.Vector3(0, TUNING.models.monsterHeight / 2, 0)); // Look at upper torso
          } else {
             // Normal mode: 1 tile behind player, at calculated height
             const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(player.object.quaternion); // Behind in world coords
             cameraPos = playerPos.clone()
               .add(behind.multiplyScalar(TILE_SIZE)) // 1 tile behind
               .add(new THREE.Vector3(0, cameraHeight, 0)); // Variable height
             // lookAtTarget was already set above for Normal mode
          }
          // Apply movement bobbing
          const bobHeight = Math.abs(Math.sin(fpvBobPhase)) * 0.25 * bobIntensity;
          cameraPos.y += bobHeight;
          
          fpvCamera.position.copy(cameraPos);
        }
        fpvCamera.up.set(0, 1, 0);
        fpvCamera.lookAt(lookAtTarget);
      }
      // Recenter the map camera if the player's world position moves outside the current view rectangle
      function ensureMapAutoCenter() {
        // Always check if player is out of view - override userHasPanned if player is completely out of viewport
        // Project player world position to map renderer screen space
        if (!mapCanvasWrapper || !renderer) return;
        const rect = mapCanvasWrapper.getBoundingClientRect();
        
        // Compute player's position in pixels relative to mapCanvasWrapper
        const viewportWidth = mapCanvasWrapper.clientWidth;
        const viewportHeight = mapCanvasWrapper.clientHeight;
        
        // Calculate player position in viewport coordinates
        const worldToViewport = new THREE.Vector3(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
        worldToViewport.project(camera);
        
        // Convert from normalized device coordinates (-1 to +1) to pixel coordinates
        const playerScreenX = (worldToViewport.x + 1) * viewportWidth / 2;
        const playerScreenY = (-worldToViewport.y + 1) * viewportHeight / 2;
        
    // Check if player is completely out of view relative to the map viewport
    const isPlayerOutOfView = 
      playerScreenX < 0 || 
      playerScreenX > viewportWidth || 
      playerScreenY < 0 || 
      playerScreenY > viewportHeight;
            
        // Force recenter if player is out of view, regardless of userHasPanned
        if (isPlayerOutOfView) {
          console.log("PLAYER OUT OF VIEW - FORCING RECENTER");
          // Center on player - !IMPORTANT player must always be visible
          mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
          placeMapCameraAt(mapCameraTarget.x, mapCameraTarget.z, zoomLevel);
          
          userHasPanned = false; // Reset pan when player is out of view
          return; // Exit early after emergency recenter
        }

        // If player circle DOM exists (on-screen minimap overlay), prefer viewport visibility check
        // If the player circle is visible somewhere in the browser viewport (not just inside map canvas), do not recenter
        const playerCircleEl = document.getElementById('player-circle') || document.querySelector('.player-circle');
        if (playerCircleEl) {
          const bounding = playerCircleEl.getBoundingClientRect();
          const inViewport = (
            bounding.top < (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.bottom > 0 &&
            bounding.left < (window.innerWidth || document.documentElement.clientWidth) &&
            bounding.right > 0
          );
          if (inViewport) {
            // Player circle is visible in the browser viewport; skip auto-centering
            return;
          }
        }
        
        // Normal margin-based centering for non-emergency cases
        if (userHasPanned || isMapCameraAnimating || isAutoMoving) return;
        
        // Enhanced margin for better player visibility
        const margin = Math.min(
          50, // Aggressive centering margin
          Math.round(Math.min(rect.width, rect.height) * 0.12)
        );
        
        if (
          playerScreenX < margin ||
          playerScreenX > viewportWidth - margin ||
          playerScreenY < margin ||
          playerScreenY > viewportHeight - margin
        ) {
          // Reduced distance requirement for more responsive centering
          const camTileX = Math.round(mapCameraTarget.x / TILE_SIZE);
          const camTileY = Math.round(mapCameraTarget.z / TILE_SIZE);
          const tileDist = Math.hypot(player.x - camTileX, player.y - camTileY);
          if (tileDist < 1.0) return; // Reduced from 1.5 for more responsive centering
          
          // Center on player using fixed-pitch placement
          mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
          placeMapCameraAt(mapCameraTarget.x, mapCameraTarget.z, zoomLevel);
          userHasPanned = false;
        }
      }

      // Simple DOF effect: apply a small CSS blur to FPV canvas when player is moving or during animations
      let dofIntensity = 0;
      function updateDOF(delta) {
        // target intensity based on whether player is animating
        const target = isPlayerAnimating ? 0.6 : 0.0;
        dofIntensity += (target - dofIntensity) * Math.min(1, delta * 3);
        if (fpvRenderer && fpvRenderer.domElement)
          fpvRenderer.domElement.style.filter = `blur(${dofIntensity * 2.5}px)`;
      }
      
      // Combat camera functions
      function startCombatCamera(monster) {
        console.log("Starting combat camera mode", monster);
        isInCombat = true;
        combatTarget = monster;
        combatCameraTransitionStart = performance.now();
      }
      
      function endCombatCamera() {
        console.log("Ending combat camera mode");
        isInCombat = false;
        combatTarget = null;
        combatCameraTransitionStart = performance.now(); // Start transition back to normal
        
        // Optional: Add a brief transition period back to normal camera
        setTimeout(() => {
          combatCameraTransitionStart = 0;
        }, TUNING.combat.camera.transitionDuration);
      }
    function updateFPS() {
        _fpsCount++;
        const now = performance.now();
        if (now - _fpsT >= 500) {
          const fps = Math.round((_fpsCount * 1000) / (now - _fpsT));
          document.getElementById("fpv-fps-badge").textContent = `${fps} FPS`;
      const hasModel = !!(player?.object?.userData?.visuals?.model3d);
      const modelKind = hasModel && player.object.userData.visuals.model3d?.isMesh ? 'stub' : (hasModel ? 'glb' : 'none');
      setStatus(`fps:${fps} model:${modelKind}`);
          _fpsT = now;
          _fpsCount = 0;
        }
      }
      function setRoomTag(id) {
        const label = id
          ? String(id).replace(/_/g, " ").toUpperCase()
          : "HALLWAY";
        const el = document.getElementById("fpv-room-tag");
        if (el) el.textContent = label;
        const t = document.getElementById("room-id-top");
        if (t) t.textContent = label;
        const p = document.getElementById("room-id-panel");
        if (p) p.textContent = label;
        setLocationLabel(id);
        setRoomDescription(id);
      }
      function setCompassHeading(rad) {
        const deg = (-rad * 180) / Math.PI;
        const needleTop = document.getElementById("compass-needle-top");
        if (needleTop)
          needleTop.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
        const needlePanel = document.getElementById("compass-needle-panel");
        if (needlePanel)
          needlePanel.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
        // Sync Origami Radar indicator when available
        if (typeof window.setRadarDirection === "function") {
          // Map degrees to cardinal for simplicity
          const norm = ((deg % 360) + 360) % 360;
          let dir = "N";
          if (norm >= 315 || norm < 45) dir = "N";
          else if (norm >= 45 && norm < 135) dir = "E";
          else if (norm >= 135 && norm < 225) dir = "S";
          else dir = "W";
          window.setRadarDirection(dir);
        }
      }

      // --- Player Actions ---
      function turnPlayer(degrees) {
        player.rotationY += THREE.MathUtils.degToRad(degrees);
        playerTargetRotation.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          player.rotationY
        );
        setCompassHeading(player.rotationY);
  updateTuningMonsterArrow(); // Sync monster arrow to player rotation
        return Promise.resolve();
      }
      function movePlayer(forward = 1) {
        // Log action for turn-based forensics
        forensics.logAction('movePlayer', { forward, x: player.x, y: player.y });
        
        // Check for confusion status effect
        if (player.statusEffects.has('confusion') && Math.random() < 0.5) {
          forward *= -1; // Reverse movement when confused
          logMessage("You stumble around confused!", "#FF00FF");
        }
        
        // Instant step; visuals follow immediately so the turn loop is snappy
        return new Promise((resolve) => {
          if (player.health <= 0) return resolve();
          const dx = -Math.round(Math.sin(player.rotationY)) * forward;
          const dy = -Math.round(Math.cos(player.rotationY)) * forward;
          const newX = player.x + dx;
          const newY = player.y + dy;
          if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT)
            return resolve();
          if (map[newY][newX].type === TILE.WALL) return resolve();
          const blocker = monsters.find((m) => m.x === newX && m.y === newY);
          if (blocker) {
            attack(player, blocker);
            onPlayerTurnTick();
            return resolve();
          }
          
          // Reset pan offset after every move to ensure map stays centered
          userHasPanned = false;
          panOffset.set(0, 0, 0);
          // Logical move first
          player.x = newX;
          player.y = newY;
          // Store current tile for NetHack-style visibility rules
          player.currentTile = map[player.y][player.x];
          
          // Process NetHack turn mechanics
          processHunger();
          processStatusEffects();
          // Smooth visual step
          try {
            playerStartPos.copy(player.object.position);
            playerTargetPos.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
            playerAnimTime = 0;
            isPlayerAnimating = true;
            
            // Start walking animation timing (001.E style)
            game._walkAnimStart = performance.now();
            game._moveTween = {
              start: performance.now(),
              dur: PLAYER_ANIMATION_SPEED * 1000, // Convert to milliseconds
              walking: true
            };
          } catch (_) {
            player.object.position.set(
              player.x * TILE_SIZE,
              0,
              player.y * TILE_SIZE
            );
          }
          if (sounds.step) sounds.step.triggerAttackRelease("C4", "16n"); // Higher, softer note with shorter duration
          // Animation removed with player model
          const playerTile = map[player.y][player.x];
          if (playerTile.roomId !== currentRoomId) {
            currentRoomId = playerTile.roomId;
            setRoomTag(currentRoomId);
            focusMapOnRoom(currentRoomId);
            // update desired zoom based on whether we're in a corridor or a room
            if (typeof updateMapZoomForTile === 'function') {
              updateMapZoomForTile(playerTile);
            }
            updateViewSwap();
          }
          updateRoomVisibility();
          
          // AUTOPICKUP - automatically collect loot when moving over it
          pickupLootIfAny(player.x, player.y);
          
          // Shrine interaction: trigger buff if stepping onto a shrine
          try {
            const shrineKey = `shrine_${player.x}_${player.y}`;
            const shrineObj = gameObjects.get(shrineKey);
            if (shrineObj && shrineObj.userData && shrineObj.userData.isShrine) {
              // Grant a gentle regeneration buff for 20 turns
              addStatusEffect('regeneration', 20, 1);
              logMessage('A calming aura surrounds you. You feel renewed.', '#66ccff');
              removeGameObject(shrineKey);
            }
          } catch {}
          
          // Check if player should exit combat (moved away from hostile monsters)
          if (isInCombat && combatTarget) {
            const distanceToTarget = Math.hypot(player.x - combatTarget.x, player.y - combatTarget.y);
            if (distanceToTarget > 1.5) { // Not adjacent anymore
              endCombatCamera();
            }
          }
          
          // stairs removed: no descend/ascend interaction
          onPlayerTurnTick();
          resolve();
        });
      }

      function searchAround() {
        logMessage("You search your surroundings.", "#a8a8a8");
        // Search for secret doors adjacent to the player and reveal them with a small chance
        return new Promise((resolve) => {
          const adj = [[player.x-1,player.y],[player.x+1,player.y],[player.x,player.y-1],[player.x,player.y+1]];
          let found = false;
          for (const [ax,ay] of adj) {
            if (ax<0||ay<0||ax>=MAP_WIDTH||ay>=MAP_HEIGHT) continue;
            const t = map[ay][ax];
            if (t && t.secretDoor) {
              // discovery chance depends on search count
              const chance = Math.min(0.95, 0.02 + player.searchCount * 0.05);
              if (Math.random() < chance) {
                // reveal door: convert to regular corridor entry
                t.secretDoor = false;
                t.type = TILE.FLOOR;
                t.roomId = 'corridor';
                // spawn a small loot pile nearby as reward
                const loot = createLootPileObject('gold', 'Gold');
                loot.position.set(ax * TILE_SIZE, 0, ay * TILE_SIZE);
                addGameObject(`loot_${ax}_${ay}_secret`, loot);
                logMessage('You uncover a hidden door and find something!', '#FFD700');
                found = true;
                break;
              }
            }
          }
          if (!found) logMessage('You search the area but find nothing.', '#A0A0A0');
          resolve(found);
        });
      }

      // automove/click-to-move removed
      function attack(attacker, target, overrideDamage) {
        // Start combat camera when player attacks or is attacked
        if ((attacker === player || target === player) && !isInCombat) {
          const monster = attacker === player ? target : attacker;
          startCombatCamera(monster);
        }
        
        // When player attacks a monster, make all monsters in room hostile
        if (attacker === player && target !== player) {
          console.log(`⚔️ Player attacked monster! Making all monsters hostile`);
          
          // Make the attacked monster immediately hostile
          if (target.aiState !== MONSTER_STATES.HOSTILE) {
            applyMonsterState(target, MONSTER_STATES.HOSTILE);
            playMonsterAlertSound(target);
            turnMonsterToFace(target, player);
            target.lastKnownPlayerPos = { x: player.x, y: player.y };
          }
          
          // Alert all monsters in the same room and nearby monsters
          alertRoomMonsters(target);
          
          // Also alert monsters within hearing range (6 tiles)
          monsters.forEach(monster => {
            if (monster !== target) {
              const distance = Math.hypot(monster.x - player.x, monster.y - player.y);
              if (distance <= 6 && monster.aiState !== MONSTER_STATES.ALLY) {
                console.log(`📢 Monster heard combat! Turning hostile`);
                applyMonsterState(monster, MONSTER_STATES.HOSTILE);
                playMonsterAlertSound(monster);
                monster.lastKnownPlayerPos = { x: player.x, y: player.y };
              }
            }
          });
        }

        // basic damage calculation; allow override for player attacks
        const base =
          overrideDamage !== undefined
            ? overrideDamage
            : attacker.attack + Math.floor(Math.random() * 2);
        const isPlayerAtk = attacker === player;
        if (isPlayerAtk) triggerDiceSpin();
        const hit = resolveToHit(attacker, target);
        if (!hit) {
          const attackerName =
            attacker === player ? "You" : `The ${attacker.name || "monster"}`;
          const targetName =
            target === player ? "you" : `the ${target.name || "monster"}`;
          logMessage(`${attackerName} miss ${targetName}.`, "#a8a8a8");
          if (attacker === player && sounds.playerAttack)
            sounds.playerAttack.triggerAttackRelease("8n");
          else if (sounds.monsterAttack)
            sounds.monsterAttack.triggerAttackRelease("C1", "8n");
          updateUI();
          return;
        }
        target.health -= base;
        const attackerName =
          attacker === player ? "You" : `The ${attacker.name || "monster"}`;
        const targetName =
          target === player ? "you" : `the ${target.name || "monster"}`;
        logMessage(
          `${attackerName} strike ${targetName} for ${base} damage.`,
          attacker === player ? "#87ceeb" : "#ff8c69"
        );
        if (attacker === player && sounds.playerAttack)
          sounds.playerAttack.triggerAttackRelease("8n");
        else if (sounds.monsterAttack)
          sounds.monsterAttack.triggerAttackRelease("C1", "8n");
        // If a monster hits the player, cancel any automove and flag wasHit
        if (attacker !== player && target === player) {
          player.wasHit = true;
          autoMoveCancel = true;

          const compasses = document.querySelectorAll(".compass-rose");
          compasses.forEach((c) => {
            c.classList.add("damaged");
            setTimeout(() => c.classList.remove("damaged"), 400);
          });
        }
        if (target.health <= 0) {
          logMessage(
            `${
              target === player
                ? "You have been defeated!"
                : `The ${target.name} has been defeated!`
            }`,
            "#ff6347"
          );
          if (target === player) {
            logMessage("Your journey ends here.", "#ff6347");
            GameTurnManager.isProcessing = true;
            
            // End combat camera when player dies
            if (isInCombat) {
              endCombatCamera();
            }
          } else {
            // grant experience to player if they killed the monster
            if (attacker === player) {
              const gained =
                (target.level || 1) * 6 + Math.floor(Math.random() * 4);
              awardXP(gained, "defeated foe");
              player.kills++; // Track kills for NetHack stats

              // Create red X marker on the floor where monster died
              const deadMark = createDeadMonsterMark(target.x, target.y);
              scene.add(deadMark);
              deadMonsterMarks.push(deadMark);
            }
            // generate loot; place a % corpse marker only if food present
            if (target.dropsKey) {
              player.hasKey = true;
              logMessage("You found the key to the next level!", "gold");
            }
            const genItems = generateLootForMonster(target);
            
            // Create individual loot drops for each item
            if (Array.isArray(genItems) && genItems.length > 0) {
              genItems.forEach((item, index) => {
                const lootObj = createLootPileObject(item.visual || item.type, item.name || item.type);
                
                // Scatter items around the monster position
                const scatterX = (Math.random() - 0.5) * 1.5;
                const scatterZ = (Math.random() - 0.5) * 1.5;
                lootObj.position.set(
                  target.object.position.x + scatterX,
                  0,
                  target.object.position.z + scatterZ
                );
                
                lootObj.userData = {
                  corpseOf: target.name || "monster",
                  items: [item], // Each loot object contains one item
                  lootIndex: index
                };
                
                addGameObject(`loot_${target.x}_${target.y}_${index}`, lootObj);
              });
              
              logMessage(`The ${target.name || "monster"} drops ${genItems.length} items!`, "#FFD700");
            }
            target.object.visible = false;
            monsters = monsters.filter((m) => m !== target);
            
            // End combat camera when monster dies
            if (isInCombat && combatTarget === target) {
              endCombatCamera();
            }
          }
        }
        updateUI();
      }

      function resolveToHit(attacker, target) {
        const roll = 1 + Math.floor(Math.random() * 20);
        if (roll === 1) return false;
        if (roll === 20) return true;
        const attStr = attacker.str ?? 10;
        const levelBonus = Math.floor(((attacker.level || 1) - 1) / 2);
        const attBonus = Math.floor((attStr - 10) / 2) + levelBonus;
        const defDex = target.dex ?? 10;
        const ac = 10 + Math.floor((defDex - 10) / 2);
        return roll + attBonus >= ac;
      }

      // Simple 2D dice canvas renderer
      let _diceAngle = 0;
      function drawDiceCanvas(angle = 0) {
        const c = document.querySelector(".mv-act .dice-canvas");
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width,
          h = c.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        const r = Math.min(w, h) * 0.36;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const rr = 5;
        ctx.moveTo(-r + rr, -r);
        ctx.lineTo(r - rr, -r);
        ctx.quadraticCurveTo(r, -r, r, -r + rr);
        ctx.lineTo(r, r - rr);
        ctx.quadraticCurveTo(r, r, r - rr, r);
        ctx.lineTo(-r + rr, r);
        ctx.quadraticCurveTo(-r, r, -r, r - rr);
        ctx.lineTo(-r, -r + rr);
        ctx.quadraticCurveTo(-r, -r, -r + rr, -r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // pips for face 4 as an example
        ctx.fillStyle = "#222";
        const p = r * 0.5,
          s = 3;
        [
          [-p, -p],
          [p, -p],
          [-p, p],
          [p, p],
        ].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      function animateDiceIdle() {
        _diceAngle = (_diceAngle + 0.02) % (Math.PI * 2);
        drawDiceCanvas(_diceAngle * 0.25);
        requestAnimationFrame(animateDiceIdle);
      }
      function triggerDiceSpin() {
        let t = 0;
        const dur = 300;
        const start = performance.now();
        const step = (now) => {
          t = (now - start) / dur;
          const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
          drawDiceCanvas(ease * 8 * Math.PI);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }

      // createStraightStairs removed (stairs disabled)

      function pulseMiniRadar() {
        const mini = document.querySelector(".mv-act .radar-mini");
        if (!mini) return;
        mini.classList.remove("pulse");
        void mini.offsetWidth; // restart animation
        mini.classList.add("pulse");
      }

      function generateLootForMonster(monster) {
        // Comprehensive NetHack-style loot with Japanese theme
        const items = [];
        const dl = Math.max(1, dungeonLevel | 0);
        const monLevel = monster.level || 1;
        
        // NetHack-style rarity tables with Japanese theme
        const weaponTable = [
          // Common weapons
          { name: "tanto", damage: "1d3", rarity: 0.4, type: "knife" },
          { name: "wakizashi", damage: "1d4", rarity: 0.3, type: "short_sword" },
          { name: "tessen", damage: "1d2", rarity: 0.2, type: "iron_fan" },
          // Uncommon weapons  
          { name: "katana", damage: "1d8", rarity: 0.15, type: "sword", minLevel: 2 },
          { name: "naginata", damage: "1d6", rarity: 0.12, type: "polearm", minLevel: 2 },
          { name: "yari", damage: "1d5", rarity: 0.1, type: "spear", minLevel: 2 },
          // Rare weapons
          { name: "nodachi", damage: "1d10", rarity: 0.05, type: "two_handed_sword", minLevel: 4 },
          { name: "kusarigama", damage: "1d7", rarity: 0.03, type: "chain_weapon", minLevel: 3 },
          { name: "tetsubo", damage: "1d9", rarity: 0.02, type: "club", minLevel: 5 }
        ];
        
        const armorTable = [
          // Common armor
          { name: "hakama", ac: 1, rarity: 0.3, type: "robe" },
          { name: "kimono", ac: 0, rarity: 0.25, type: "robe" },
          { name: "tabi", ac: 1, rarity: 0.2, type: "boots" },
          // Uncommon armor
          { name: "do-maru", ac: 3, rarity: 0.15, type: "light_armor", minLevel: 2 },
          { name: "hachimaki", ac: 1, rarity: 0.1, type: "helmet" },
          { name: "kote", ac: 2, rarity: 0.08, type: "gauntlets", minLevel: 2 },
          // Rare armor
          { name: "yoroi", ac: 5, rarity: 0.05, type: "heavy_armor", minLevel: 4 },
          { name: "kabuto", ac: 3, rarity: 0.03, type: "helmet", minLevel: 3 },
          { name: "suneate", ac: 2, rarity: 0.02, type: "leg_armor", minLevel: 3 }
        ];
        
        const foodTable = [
          { name: "rice ball", nutrition: 200, rarity: 0.4 },
          { name: "dried fish", nutrition: 150, rarity: 0.3 },
          { name: "miso soup", nutrition: 100, rarity: 0.25 },
          { name: "pickled vegetables", nutrition: 80, rarity: 0.2 },
          { name: "green tea", nutrition: 50, rarity: 0.15 },
          { name: "sake", nutrition: 120, rarity: 0.1, effect: "confusion" },
          { name: "mochi", nutrition: 250, rarity: 0.08 },
          { name: "sushi", nutrition: 300, rarity: 0.05, minLevel: 2 }
        ];
        
        const scrollTable = [
          { name: "scroll of bushido", effect: "identify", rarity: 0.3 },
          { name: "scroll of wind walking", effect: "teleport", rarity: 0.25 },
          { name: "scroll of inner peace", effect: "healing", rarity: 0.2 },
          { name: "scroll of shadow step", effect: "invisibility", rarity: 0.15 },
          { name: "scroll of dragon's breath", effect: "fire", rarity: 0.1, minLevel: 2 },
          { name: "scroll of tsunami", effect: "flood", rarity: 0.05, minLevel: 3 }
        ];
        
        const potionTable = [
          { name: "potion of green tea", effect: "healing", power: 4, rarity: 0.3 },
          { name: "potion of sake", effect: "strength", power: 2, rarity: 0.2 },
          { name: "potion of plum wine", effect: "speed", power: 3, rarity: 0.15 },
          { name: "potion of mountain spring", effect: "mana", power: 5, rarity: 0.1 },
          { name: "potion of cherry blossom", effect: "regeneration", power: 6, rarity: 0.08, minLevel: 2 },
          { name: "potion of dragon blood", effect: "fire_resist", power: 8, rarity: 0.03, minLevel: 4 }
        ];
        
        const ringTable = [
          { name: "ring of bamboo", effect: "protection", power: 1, rarity: 0.1 },
          { name: "ring of jade", effect: "luck", power: 2, rarity: 0.08 },
          { name: "ring of cherry wood", effect: "stealth", power: 1, rarity: 0.06 },
          { name: "ring of iron", effect: "strength", power: 2, rarity: 0.05, minLevel: 2 },
          { name: "ring of moonstone", effect: "magic_resist", power: 3, rarity: 0.03, minLevel: 3 },
          { name: "ring of dragon scale", effect: "fire_immunity", power: 5, rarity: 0.01, minLevel: 5 }
        ];
        
        const amuletTable = [
          { name: "amulet of ancestors", effect: "wisdom", power: 1, rarity: 0.08 },
          { name: "amulet of the crane", effect: "dexterity", power: 2, rarity: 0.06 },
          { name: "amulet of the tiger", effect: "strength", power: 2, rarity: 0.05 },
          { name: "amulet of the dragon", effect: "power", power: 3, rarity: 0.03, minLevel: 3 },
          { name: "amulet of the phoenix", effect: "life_saving", power: 1, rarity: 0.01, minLevel: 4 }
        ];

        // Gold drops - NetHack style, more frequent
        if (Math.random() < 0.75) {
          const baseGold = 3 + Math.floor(dl / 2);
          const bonusGold = Math.floor(Math.random() * (5 + dl * 2));
          items.push({
            type: "gold",
            amount: baseGold + bonusGold,
            visual: "coin"
          });
        }

        // Food drops - essential for NetHack survival
        if (Math.random() < 0.45) {
          const availableFood = foodTable.filter(f => !f.minLevel || monLevel >= f.minLevel);
          const food = availableFood[Math.floor(Math.random() * availableFood.length)];
          items.push({
            type: "food",
            name: food.name,
            nutrition: food.nutrition + Math.floor(Math.random() * 50),
            effect: food.effect,
            visual: "food"
          });
        }

        // Weapons - NetHack style with level restrictions
        if (Math.random() < 0.18) {
          const availableWeapons = weaponTable.filter(w => !w.minLevel || monLevel >= w.minLevel);
          if (availableWeapons.length > 0) {
            const weapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
            const enchantment = Math.random() < 0.1 ? Math.floor(Math.random() * 3) + 1 : 0;
            items.push({
              type: "weapon",
              name: weapon.name,
              damage: weapon.damage,
              weaponType: weapon.type,
              enchantment: enchantment,
              visual: weapon.type.includes("sword") || weapon.type === "knife" ? "katana" : "weapon"
            });
          }
        }

        // Armor - Less common but important
        if (Math.random() < 0.15) {
          const availableArmor = armorTable.filter(a => !a.minLevel || monLevel >= a.minLevel);
          if (availableArmor.length > 0) {
            const armor = availableArmor[Math.floor(Math.random() * availableArmor.length)];
            const enchantment = Math.random() < 0.08 ? Math.floor(Math.random() * 3) + 1 : 0;
            items.push({
              type: "armor",
              name: armor.name,
              ac: armor.ac + enchantment,
              armorType: armor.type,
              enchantment: enchantment,
              visual: "shield"
            });
          }
        }

        // Potions - NetHack healing and utility
        if (Math.random() < 0.22) {
          const availablePotions = potionTable.filter(p => !p.minLevel || monLevel >= p.minLevel);
          if (availablePotions.length > 0) {
            const potion = availablePotions[Math.floor(Math.random() * availablePotions.length)];
            items.push({
              type: "potion",
              name: potion.name,
              effect: potion.effect,
              power: potion.power + Math.floor(dl / 3),
              visual: "potion"
            });
          }
        }

        // Scrolls - NetHack utility magic
        if (Math.random() < 0.12) {
          const availableScrolls = scrollTable.filter(s => !s.minLevel || monLevel >= s.minLevel);
          if (availableScrolls.length > 0) {
            const scroll = availableScrolls[Math.floor(Math.random() * availableScrolls.length)];
            items.push({
              type: "scroll",
              name: scroll.name,
              effect: scroll.effect,
              visual: "scroll"
            });
          }
        }

        // Rings - Rare but powerful
        if (Math.random() < 0.06) {
          const availableRings = ringTable.filter(r => !r.minLevel || monLevel >= r.minLevel);
          if (availableRings.length > 0) {
            const ring = availableRings[Math.floor(Math.random() * availableRings.length)];
            items.push({
              type: "ring",
              name: ring.name,
              effect: ring.effect,
              power: ring.power,
              visual: "ring"
            });
          }
        }

        // Amulets - Very rare
        if (Math.random() < 0.03) {
          const availableAmulets = amuletTable.filter(a => !a.minLevel || monLevel >= a.minLevel);
          if (availableAmulets.length > 0) {
            const amulet = availableAmulets[Math.floor(Math.random() * availableAmulets.length)];
            items.push({
              type: "amulet",
              name: amulet.name,
              effect: amulet.effect,
              power: amulet.power,
              visual: "amulet"
            });
          }
        }

        // Special monster drops
        if (monster.dropsKey) {
          items.push({ 
            type: "key", 
            name: "ornate key",
            visual: "key"
          });
        }

        return items;
      }

      // --- Automove (Click-to-Move) ---
      function startAutoMoveTo(tx, ty) {
        if (isAutoMoving) {
          autoMoveCancel = true;
        } // Cancel previous before starting new
        // Compute path
        const path = findPath({ x: player.x, y: player.y }, { x: tx, y: ty });
        if (!path || path.length < 2)
          return logMessage("No path found.", "#a8a8a8");
        clearAutoTrail();
        // Paint the trail once
        for (let i = 1; i < path.length; i++)
          addTrailMarker(path[i].x, path[i].y);
        // Walk the path
        isAutoMoving = true;
        autoMoveCancel = false;
        player.wasHit = false;

        // Forensics: start session
        AutoMoveForensics.start(player.x, player.y, tx, ty, path.length);

        // Use a simpler step-by-step movement approach
        let currentStep = 0;

        function moveToNextStep() {
          currentStep++;
          if (currentStep >= path.length) {
            // Reached destination
            clearAutoTrail();
            isAutoMoving = false;
            autoMoveCancel = false;
            player.wasHit = false;
            AutoMoveForensics.done();
            return;
          }

          if (autoMoveCancel || player.wasHit || player.health <= 0) {
            clearAutoTrail();
            isAutoMoving = false;
            autoMoveCancel = false;
            player.wasHit = false;
            AutoMoveForensics.cancelled({ autoMoveCancel, wasHit: player.wasHit, health: player.health });
            return;
          }

          const step = path[currentStep];
          const dx = step.x - player.x;
          const dy = step.y - player.y;

          AutoMoveForensics.step(currentStep, step, { dx, dy, isAutoMoving, autoMoveCancel });

          // Face the direction we want to move
          const desiredAngle = Math.atan2(-dx, -dy);
          player.rotationY = desiredAngle;

          // Update player object rotation
          playerTargetRotation.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            player.rotationY
          );
          if (player.object) {
            player.object.quaternion.copy(playerTargetRotation);
          }
          setCompassHeading(player.rotationY);
          updateTuningMonsterArrow(); // Sync monster arrow to player rotation

          // Queue the movement and continue after it completes
          GameTurnManager.queuePlayerAction(movePlayer, 1).then(() => {
            // Check if we actually moved
            if (player.x === step.x && player.y === step.y) {
              // Successfully moved, continue to next step with smooth walking animation
              AutoMoveForensics.moved(currentStep);
              setTimeout(moveToNextStep, 200); // Smooth walking pace - 200ms between steps
            } else {
              // Movement was blocked or failed
              clearAutoTrail();
              isAutoMoving = false;
              autoMoveCancel = false;
              logMessage("Path blocked.", "#ffa500");
              AutoMoveForensics.blocked({
                reason: 'post-move position mismatch',
                expected: step,
                actual: { x: player.x, y: player.y }
              });
            }
          }).catch((err) => {
            // Ensure a runtime error doesn't freeze the automove loop
            console.warn('AutoMove queue error:', err);
            clearAutoTrail();
            isAutoMoving = false;
            autoMoveCancel = false;
            AutoMoveForensics.blocked({ reason: 'queue-error', error: String(err) });
          });
        }

        // Start the movement sequence
        moveToNextStep();
      }

      function attachClickToMoveFPV() {
        const canvas = fpvRenderer.domElement;
        canvas.style.cursor = "crosshair";
        canvas.addEventListener("click", (e) => {
          const rect = canvas.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          const mouseVec = new THREE.Vector2(x, y);
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouseVec, fpvCamera);
          // Prefer FPV floor for intersections; fallback to map floor
          const floorObj = fpvFloorMesh || floorMesh;
          const intersects = floorObj ? raycaster.intersectObject(floorObj, true) : [];
          if (intersects && intersects.length) {
            const pt = intersects[0].point;
            const tx = Math.round(pt.x / TILE_SIZE),
              ty = Math.round(pt.z / TILE_SIZE);
            if (
              tx >= 0 &&
              tx < MAP_WIDTH &&
              ty >= 0 &&
              ty < MAP_HEIGHT &&
              map[ty][tx].type === TILE.FLOOR
            ) {
              console.log(`[FPV click] -> (${tx},${ty}) from (${player.x},${player.y})`);
              startAutoMoveTo(tx, ty);
            }
          }
        });
      }

      function attachClickToMoveMap() {
        const canvas = renderer.domElement;
        canvas.style.cursor = "crosshair";
        canvas.addEventListener("click", (e) => {
          const rect = canvas.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          const mouseVec = new THREE.Vector2(x, y);
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouseVec, camera);
          
          // Create a temporary plane at y=0 to intersect with
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const intersectPoint = new THREE.Vector3();
          raycaster.ray.intersectPlane(plane, intersectPoint);
          
          if (intersectPoint) {
            const tx = Math.round(intersectPoint.x / TILE_SIZE);
            const ty = Math.round(intersectPoint.z / TILE_SIZE);
            
            if (
              tx >= 0 &&
              tx < MAP_WIDTH &&
              ty >= 0 &&
              ty < MAP_HEIGHT &&
              map[ty][tx].type === TILE.FLOOR
            ) {
              console.log(`[MAP click] -> (${tx},${ty}) from (${player.x},${player.y})`);
              startAutoMoveTo(tx, ty);
            }
          }
        });
      }

      function pickupLootIfAny(x, y) {
        // Gather all loot objects at this tile, supporting multiple drops per tile
        const baseKey = `loot_${x}_${y}`;
        const searchKey = `search_loot_${x}_${y}`;
        const foundEntries = [];
        // Include exact base key if present
        if (gameObjects.has(baseKey)) {
          foundEntries.push([baseKey, gameObjects.get(baseKey)]);
        }
        // Include any indexed loot and search loot at this tile
        gameObjects.forEach((obj, key) => {
          if (
            (key.startsWith(baseKey + "_") || key.startsWith(searchKey + "_")) &&
            obj && obj.userData
          ) {
            foundEntries.push([key, obj]);
          }
        });

        if (foundEntries.length === 0) {
          return; // Silent when no loot - autopickup should be seamless
        }

        // Process and collect items from all found loot objects
        let pickedAny = false;
        for (const [key, loot] of foundEntries) {
          const items = loot.userData && loot.userData.items ? loot.userData.items : [];
          if (!items.length) {
            // Clean up empty loot objects
            removeGameObject(key);
            continue;
          }
          for (const it of items) {
            pickedAny = true;
            switch (it.type) {
              case "gold": {
                const amt = it.amount || 0;
                if (amt > 0) {
                  player.gold = (player.gold || 0) + amt;
                  logMessage(`You pick up ${amt} gold.`, "gold");
                }
                break;
              }
              case "food": {
                logMessage(`You pick up ${it.name || "food"}.`, "#a8a8a8");
                player.inventory.push(it);
                break;
              }
              case "potion": {
                const display = getItemDisplayName(it);
                logMessage(`You pick up ${display}.`, "#a8a8a8");
                player.inventory.push(it);
                break;
              }
              case "scroll": {
                const display = getItemDisplayName(it);
                logMessage(`You pick up ${display}.`, "#a8a8a8");
                player.inventory.push(it);
                break;
              }
              case "ring": {
                const display = getItemDisplayName(it);
                logMessage(`You pick up ${display}.`, "#a8a8a8");
                player.inventory.push(it);
                break;
              }
              case "amulet": {
                const display = getItemDisplayName(it);
                logMessage(`You pick up ${display}.`, "#a8a8a8");
                player.inventory.push(it);
                break;
              }
              case "weapon":
              case "armor": {
                const display = getItemDisplayName(it);
                logMessage(`You pick up ${display}.`, "#a8a8a8");
                player.inventory.push(it);
                
                // AUTOEQUIP - automatically equip better items
                autoEquipItem(it, player.inventory.length - 1);
                break;
              }
              case "key": {
                player.hasKey = true;
                logMessage("You pick up a key!", "gold");
                break;
              }
              default: {
                const nm = it.name || it.type || "item";
                logMessage(`You pick up ${nm}.`, "#a8a8a8");
                player.inventory.push(it);
              }
            }
          }
          // Remove the loot object from scene and registry
          removeGameObject(key);
        }

        if (pickedAny) updateUI();
      }

      // Auto-equip function: automatically equip items if they're better than current
      function autoEquipItem(item, inventoryIndex) {
        if (!item || (item.type !== "weapon" && item.type !== "armor")) return;
        
        if (item.type === "weapon") {
          const currentWeaponIndex = player.equippedWeapon;
          const currentWeapon = currentWeaponIndex !== -1 ? player.inventory[currentWeaponIndex] : null;
          const currentAttack = currentWeapon ? (currentWeapon.attack || 1) : 1;
          const newAttack = item.attack || 1;
          
          if (newAttack > currentAttack) {
            player.equippedWeapon = inventoryIndex;
            logMessage(`Auto-equipped ${getItemDisplayName(item)} (ATK: ${newAttack})!`, "#00ff00");
            updatePlayerStats();
          }
        } else if (item.type === "armor") {
          const currentArmorIndex = player.equippedArmor;
          const currentArmor = currentArmorIndex !== -1 ? player.inventory[currentArmorIndex] : null;
          const currentDefense = currentArmor ? (currentArmor.defense || 0) : 0;
          const newDefense = item.defense || 0;
          
          if (newDefense > currentDefense) {
            player.equippedArmor = inventoryIndex;
            logMessage(`Auto-equipped ${getItemDisplayName(item)} (DEF: ${newDefense})!`, "#00ff00");
            updatePlayerStats();
          }
        }
      }

      function checkLevelUp() {
        player.level = player.level || 1;
        player.exp = player.exp || 0;
        while (player.exp >= player.expToLevel()) {
          player.exp -= player.expToLevel();
          player.level++;
          // increase core stats modestly on level
          player.maxHealth += 2 + Math.floor(Math.random() * 3);
          player.health = player.maxHealth;
          player.str += 1 + Math.floor(Math.random() * 2);
          player.dex += 1 + Math.floor(Math.random() * 2);
          player.con += 1 + Math.floor(Math.random() * 2);
          player.attack = Math.max(1, Math.floor((player.str - 10) / 2) + 1);
          logMessage(`You advance to level ${player.level}!`, "lime");
        }
        updateUI();
      }

      // 👁️ Player Detection System
      function detectPlayer(monster) {
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
  const angleToPlayer = Math.atan2(dx, dy);
        const facingAngle = monster.facingAngle || 0;
        const angleDiff = Math.abs(angleToPlayer - facingAngle);
        const normalizedAngle = Math.min(angleDiff, 2 * Math.PI - angleDiff);

        // Vision cone detection
        let inVisionCone = false;
        let detectionRange = 0;

        if (normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.FRONT) {
          // Front detection
          detectionRange = MONSTER_AI_CONFIG.VISION_FRONT_RANGE;
          inVisionCone = distance <= detectionRange;
        } else if (normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.SIDE) {
          // Side detection  
          detectionRange = MONSTER_AI_CONFIG.VISION_SIDE_RANGE;
          inVisionCone = distance <= detectionRange;
        }
        // No behind detection

        // Hearing detection
        const inHearingRange = distance <= MONSTER_AI_CONFIG.HEARING_RANGE;

  // Line of sight check using tile raycast
  const hasLOS = hasLineOfSight(monster.x, monster.y, player.x, player.y);

        return {
          canSee: inVisionCone && hasLOS,
          canHear: inHearingRange,
          distance,
          angleToPlayer,
          inFrontArc: normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.FRONT,
          inSideArc: normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.SIDE
        };
      }

      // 🎯 State Handlers
      function handleIdleState(monster, detection) {
        if (detection.canSee || detection.canHear) {
          monster.aiState = MONSTER_STATES.HOSTILE;
          monster.lastKnownPlayerPos = { x: player.x, y: player.y };
        }
      }

      function handleAlertedState(monster, detection) {
        // Immediately transition to hostile
        monster.aiState = MONSTER_STATES.HOSTILE;
        monster.lastKnownPlayerPos = { x: player.x, y: player.y };
        
        // Play alert sound
        playMonsterAlertSound(monster);
        
        // Alert other monsters in the same room
        alertRoomMonsters(monster);
      }

      function handleHostileState(monster, detection) {
        if (detection.canSee && detection.distance <= 10) {
          // Continue pursuit
          monster.lastKnownPlayerPos = { x: player.x, y: player.y };
        } else if (!detection.canSee || detection.distance > 10) {
          // Lost sight - start searching
          monster.aiState = MONSTER_STATES.SEARCHING;
          monster.searchTurnsLeft = MONSTER_AI_CONFIG.SEARCH_TURNS;
        }
      }

      function handleSearchingState(monster, detection) {
        if (detection.canSee) {
          // Found player again
          monster.aiState = MONSTER_STATES.HOSTILE;
          monster.lastKnownPlayerPos = { x: player.x, y: player.y };
          playMonsterAlertSound(monster);
        } else {
          monster.searchTurnsLeft--;
          if (monster.searchTurnsLeft <= 0) {
            // Give up search - return home
            monster.aiState = MONSTER_STATES.IDLE;
          }
        }
      }

      function handleReturningHomeState(monster, detection) {
        // Check if back in spawn room
        const currentTile = map[monster.y]?.[monster.x];
        if (currentTile && currentTile.roomId === monster.homeRoom) {
          monster.aiState = MONSTER_STATES.IDLE;
          monster.flashCounter = 2; // Flash twice when returning home
        } else if (detection.canSee) {
          // Player spotted during return - re-engage
          monster.aiState = MONSTER_STATES.HOSTILE;
          monster.lastKnownPlayerPos = { x: player.x, y: player.y };
          playMonsterAlertSound(monster);
        }
      }

      // 🎵 Audio System
      function playMonsterAlertSound(monster) {
        if (monster.alertSound) return; // Already playing
        
        try {
          const audio = new Audio(GOBLIN_ALERT_SOUND_URL);
          audio.volume = 0.3;
          audio.play().catch(e => console.warn('Monster alert sound failed:', e));
          monster.alertSound = audio;
          
          // Clear reference when done
          audio.onended = () => monster.alertSound = null;
        } catch (e) {
          console.warn('Failed to create monster alert sound:', e);
        }
      }

      function timeNow() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      }

      function primeMonsterRuntime(monster) {
        if (!monster) return;
        if (!monster.spawnPos) {
          monster.spawnPos = { x: monster.x, y: monster.y };
        }
        if (typeof monster.aiState === 'undefined' || monster.aiState === null) {
          monster.aiState = MONSTER_STATES.IDLE;
          monster.state = 'IDLE';
          monster.hostileState = 'INACTIVE';
        }
        if (typeof monster.speedRatio !== 'number') {
          monster.speedRatio = MONSTER_SPEED_RATIO;
        }
        if (typeof monster.facingAngle !== 'number') {
          monster.facingAngle = 0;
        }
        if (typeof monster.searchTurnsLeft !== 'number') {
          monster.searchTurnsLeft = MONSTER_AI_CONFIG.SEARCH_DURATION_TURNS;
        }
      }

      function applyMonsterState(monster, nextState, meta = {}) {
        if (!monster) return;
        const normalized = nextState || MONSTER_STATES.IDLE;
        const previous = monster.aiState || MONSTER_STATES.IDLE;
        if (previous === normalized) return;

        monster.previousState = previous;
        monster.aiState = normalized;
        monster.state = normalized;

        if (normalized === MONSTER_STATES.HOSTILE) {
          monster.hostileState = 'HOSTILE';
        } else if (normalized === MONSTER_STATES.SEARCHING) {
          monster.hostileState = 'SEARCHING';
          monster.searchTurnsLeft = meta.searchTurns ?? MONSTER_AI_CONFIG.SEARCH_DURATION_TURNS;
          monster._searchBlinkEnd = timeNow() + MONSTER_AI_CONFIG.BLINK_INTERVAL_MS * MONSTER_AI_CONFIG.BLINK_CYCLES;
        } else if (normalized === MONSTER_STATES.ALLY) {
          monster.hostileState = 'ALLY';
        } else if (normalized === MONSTER_STATES.GAMING) {
          monster.hostileState = 'GAMING';
          monster.gamingTimeout = meta.gamingTimeout ?? (timeNow() + 3200);
          monster.returnStateAfterGaming = meta.returnState ?? previous ?? MONSTER_STATES.IDLE;
        } else {
          monster.hostileState = 'INACTIVE';
          monster.searchTurnsLeft = MONSTER_AI_CONFIG.SEARCH_DURATION_TURNS;
        }

        if (normalized !== MONSTER_STATES.SEARCHING) {
          monster._searchBlinkEnd = 0;
        }
        if (normalized !== MONSTER_STATES.GAMING) {
          monster.gamingTimeout = null;
        }

        if (typeof onMonsterStateChange === 'function') {
          onMonsterStateChange(monster, previous, normalized);
        }
        updateMonsterIndicators(monster);
        updateMonsterVisuals(monster);
      }

      function computeMonsterDetection(monster) {
        if (!monster) {
          return { canSee: false, distance: Infinity, angleDiff: Math.PI };
        }
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const distance = Math.hypot(dx, dy);
        const los = hasLineOfSight(monster.x, monster.y, player.x, player.y);
        const angleToPlayer = Math.atan2(dx, dy);
        let facing = typeof monster.facingAngle === 'number' ? monster.facingAngle : 0;
        let angleDiff = Math.abs(angleToPlayer - facing);
        if (angleDiff > Math.PI) angleDiff = (2 * Math.PI) - angleDiff;
        const inFov = angleDiff <= (MONSTER_AI_CONFIG.FIELD_OF_VIEW * 0.5);
        const canSee = los && inFov && distance <= MONSTER_AI_CONFIG.LOS_MAX_RANGE;
        return { canSee, distance, angleDiff, los, angleToPlayer };
      }

      function attemptMonsterMove(monster, target, ratio = MONSTER_SPEED_RATIO) {
        if (!monster || !target) return;
        const moveChance = Math.min(1, Math.max(0, ratio));
        if (Math.random() <= moveChance) {
          smartChase(monster, target);
        }
      }

      function attemptMonsterAttack(monster) {
        if (!monster || monster.health <= 0) return;
        if (typeof canMonsterAttack !== 'function' || typeof attack !== 'function') return;
        const canAtk = canMonsterAttack(monster, player);
        if (!canAtk) return;

        if (!monster.attackCooldown || monster.attackCooldown <= 0) {
          const mBase = (monster.attack || 1) + Math.floor(Math.random() * 2);
          attack(monster, player, mBase);
          monster.attackCooldown = 2 + Math.floor(Math.random() * 3);
        } else {
          monster.attackCooldown--;
        }
        turnMonsterToFace(monster, player);
      }

      function updateMonsterAI(monster) {
        if (MONSTER_AI_DISABLED) return;
        if (!monster || monster.health <= 0) return;

        primeMonsterRuntime(monster);
        const detection = computeMonsterDetection(monster);
        const currentState = monster.aiState || MONSTER_STATES.IDLE;

        // Enhanced debugging for detection issues
        if (detection.distance <= 8 && detection.canSee) {
          console.log(`🔍 Monster Detection:`, {
            monster: `${monster.x},${monster.y}`,
            player: `${player.x},${player.y}`,
            distance: Math.round(detection.distance * 10) / 10,
            canSee: detection.canSee,
            los: detection.los,
            angleDiff: Math.round(detection.angleDiff * 180 / Math.PI),
            state: currentState,
            facing: Math.round((monster.facingAngle || 0) * 180 / Math.PI)
          });
        }

        if (currentState === MONSTER_STATES.GAMING) {
          if (monster.gamingTimeout && timeNow() >= monster.gamingTimeout) {
            const fallback = monster.returnStateAfterGaming && monster.returnStateAfterGaming !== MONSTER_STATES.GAMING
              ? monster.returnStateAfterGaming
              : (monster.previousState && monster.previousState !== MONSTER_STATES.GAMING
                ? monster.previousState
                : MONSTER_STATES.IDLE);
            applyMonsterState(monster, fallback);
          } else {
            turnMonsterToFace(monster, player);
            return;
          }
        }

        // ENHANCED DETECTION → HOSTILE TRANSITIONS
        if (monster.aiState !== MONSTER_STATES.ALLY) {
          if (detection.canSee && monster.aiState === MONSTER_STATES.IDLE) {
            // IDLE → HOSTILE: First time spotting player
            console.log(`🚨 Monster spotted player! IDLE → HOSTILE`);
            monster.lastKnownPlayerPos = { x: player.x, y: player.y };
            applyMonsterState(monster, MONSTER_STATES.HOSTILE);
            playMonsterAlertSound(monster);
            alertRoomMonsters(monster);
            turnMonsterToFace(monster, player);
          } else if (detection.canSee && monster.aiState === MONSTER_STATES.SEARCHING) {
            // SEARCHING → HOSTILE: Re-spotted player
            console.log(`🎯 Monster re-spotted player! SEARCHING → HOSTILE`);
            monster.lastKnownPlayerPos = { x: player.x, y: player.y };
            applyMonsterState(monster, MONSTER_STATES.HOSTILE);
            playMonsterAlertSound(monster);
            turnMonsterToFace(monster, player);
          } else if (detection.canSee && monster.aiState === MONSTER_STATES.HOSTILE) {
            // HOSTILE: Continue tracking
            monster.lastKnownPlayerPos = { x: player.x, y: player.y };
            turnMonsterToFace(monster, player);
          }
        }

        switch (monster.aiState) {
          case MONSTER_STATES.IDLE: {
            if (Math.random() < 0.04) {
              monster.facingAngle = Math.atan2(player.x - monster.x, player.y - monster.y);
            }
            break;
          }
          case MONSTER_STATES.HOSTILE: {
            // Always face the player when hostile
            turnMonsterToFace(monster, player);
            
            if (detection.canSee) {
              // Player is visible - chase directly at 75% speed
              monster.lastKnownPlayerPos = { x: player.x, y: player.y };
              attemptMonsterMove(monster, player, MONSTER_AI_CONFIG.SPEED_RATIO);
              monster.lostSightCounter = 0; // Reset lost sight counter
            } else {
              // Lost sight of player
              monster.lostSightCounter = (monster.lostSightCounter || 0) + 1;
              if (monster.lostSightCounter >= 2) {
                // Lost sight for 2+ turns, start searching
                console.log(`👁️ Lost sight of player! HOSTILE → SEARCHING`);
                applyMonsterState(monster, MONSTER_STATES.SEARCHING, { 
                  searchTurns: MONSTER_AI_CONFIG.SEARCH_DURATION_TURNS 
                });
              } else {
                // Still chase last known position for 1-2 turns
                if (monster.lastKnownPlayerPos) {
                  attemptMonsterMove(monster, monster.lastKnownPlayerPos, MONSTER_AI_CONFIG.SPEED_RATIO);
                }
              }
            }
            break;
          }
          case MONSTER_STATES.SEARCHING: {
            // Detection handled above, this case handles continued searching
            monster.searchTurnsLeft = (typeof monster.searchTurnsLeft === 'number' ? 
              monster.searchTurnsLeft : MONSTER_AI_CONFIG.SEARCH_DURATION_TURNS) - 1;
            
            if (monster.lastKnownPlayerPos) {
              // Move toward last known position at search speed (75% of player)
              attemptMonsterMove(monster, monster.lastKnownPlayerPos, MONSTER_AI_CONFIG.SEARCH_SPEED_RATIO);
              
              // If reached last known position, clear it
              if (monster.x === monster.lastKnownPlayerPos.x && monster.y === monster.lastKnownPlayerPos.y) {
                monster.lastKnownPlayerPos = null;
                console.log(`📍 Reached last known player position`);
              }
            } else {
              // No last known position - wander randomly
              if (Math.random() < 0.3) {
                const dirs = [
                  { x: monster.x + 1, y: monster.y },
                  { x: monster.x - 1, y: monster.y },
                  { x: monster.x, y: monster.y + 1 },
                  { x: monster.x, y: monster.y - 1 }
                ];
                const validDirs = dirs.filter(pos => 
                  pos.x >= 0 && pos.x < MAP_WIDTH && 
                  pos.y >= 0 && pos.y < MAP_HEIGHT &&
                  map[pos.y] && map[pos.y][pos.x] && 
                  map[pos.y][pos.x].type !== TILE.WALL
                );
                if (validDirs.length > 0) {
                  const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                  attemptMonsterMove(monster, randomDir, MONSTER_AI_CONFIG.SEARCH_SPEED_RATIO * 0.5);
                }
              }
            }
            
            // End search after duration
            if (monster.searchTurnsLeft <= 0) {
              console.log(`💤 Search expired! SEARCHING → IDLE`);
              monster.lastKnownPlayerPos = null;
              monster.lostSightCounter = 0;
              applyMonsterState(monster, MONSTER_STATES.IDLE);
              monster.flashCounter = 2; // Flash when ending search
            }
            break;
          }
          case MONSTER_STATES.ALLY: {
            break;
          }
        }

        attemptMonsterAttack(monster);
      }

      function setAllMonstersGaming(durationMs = 3200) {
        const expiry = timeNow() + durationMs;
        monsters.forEach(monster => {
          if (!monster || monster.health <= 0) return;
          const fallback = monster.aiState && monster.aiState !== MONSTER_STATES.GAMING ? monster.aiState : MONSTER_STATES.IDLE;
          applyMonsterState(monster, MONSTER_STATES.GAMING, { gamingTimeout: expiry, returnState: fallback });
        });
      }

      // 🚨 Room Alert System
      function alertRoomMonsters(alertingMonster) {
        const alertRoom = map[alertingMonster.y]?.[alertingMonster.x]?.roomId;
        if (!alertRoom) return;

        monsters.forEach(monster => {
          if (!monster || monster === alertingMonster || monster.health <= 0) return;
          const monsterRoom = map[monster.y]?.[monster.x]?.roomId;
          if (monsterRoom === alertRoom && monster.aiState !== MONSTER_STATES.HOSTILE && monster.aiState !== MONSTER_STATES.GAMING) {
            const playerRoom = map[player.y]?.[player.x]?.roomId;
            applyMonsterState(monster, MONSTER_STATES.HOSTILE);
          }
        });
      }

      // 🎨 State Change Effects
      function onMonsterStateChange(monster, oldState, newState) {
        console.log(`🐉 Monster ${monster.name} state: ${oldState} → ${newState}`);

        if (newState === MONSTER_STATES.HOSTILE) {
          monster.flashCounter = 1;
        } else if (newState === MONSTER_STATES.SEARCHING) {
          monster.flashCounter = 2;
        } else {
          monster.flashCounter = 0;
        }

        if (newState === MONSTER_STATES.HOSTILE) {
          monster.state = 'HOSTILE';
          monster.hostileState = 'HOSTILE';
          try {
            const playerRoom = map[player.y]?.[player.x]?.roomId;
            const monsterRoom = map[monster.y]?.[monster.x]?.roomId || monster.homeRoom;
            if (playerRoom && monsterRoom && playerRoom === monsterRoom) {
              makeRoomMonstersHostile(monsterRoom);
            }
          } catch (e) {
            /* noop */
          }
        } else if (newState === MONSTER_STATES.SEARCHING) {
          monster.state = 'SEARCHING';
          monster.hostileState = 'SEARCHING';
        } else if (newState === MONSTER_STATES.ALLY) {
          monster.state = 'ALLY';
          monster.hostileState = 'ALLY';
        } else if (newState === MONSTER_STATES.GAMING) {
          monster.state = 'GAMING';
          monster.hostileState = 'GAMING';
        } else {
          monster.state = 'IDLE';
          monster.hostileState = 'INACTIVE';
        }
      }

      // 🎮 Behavior Execution
      function executeMonsterBehavior(monster) {
        const canAtk = canMonsterAttack(monster, player);
        
        if (canAtk && (monster.aiState === MONSTER_STATES.HOSTILE)) {
          // Attack if adjacent to player
          if (!monster.attackCooldown || monster.attackCooldown <= 0) {
            const mBase = monster.attack + Math.floor(Math.random() * 2);
            attack(monster, player, mBase);
            monster.attackCooldown = 2 + Math.floor(Math.random() * 3);
          } else {
            monster.attackCooldown--;
          }
          turnMonsterToFace(monster, player);
        } else if (GameTurnManager.currentTurn === "MONSTERS") {
          // Movement behavior
          let target = null;
          let speed = 1.0;
          
          switch (monster.aiState) {
            case MONSTER_STATES.HOSTILE:
              target = { x: player.x, y: player.y };
              // Determine speed based on room
              const playerRoom = map[player.y]?.[player.x]?.roomId;
              const monsterRoom = map[monster.y]?.[monster.x]?.roomId;
              speed = (playerRoom === monsterRoom) ? 
                MONSTER_AI_CONFIG.SPEEDS.SAME_ROOM : 
                MONSTER_AI_CONFIG.SPEEDS.OUTSIDE_ROOM;
              break;
              
            case MONSTER_STATES.SEARCHING:
              target = monster.lastKnownPlayerPos;
              speed = MONSTER_AI_CONFIG.SPEEDS.SEARCHING;
              break;
              
            case MONSTER_STATES.IDLE:
              target = monster.spawnPos;
              speed = MONSTER_AI_CONFIG.SPEEDS.SAME_ROOM;
              break;
          }
          
          // Apply monster size/level speed rules: base speeds above are move probabilities per tick.
          // Monsters level 5+ are capped to ~1/3 speed regardless of room context.
          let moveChance = speed;
          try {
            const effectiveLevel = monster.level || 1;
            if (effectiveLevel >= 5) {
              moveChance = Math.min(moveChance, 0.34);
            }
          } catch (e) {}
          if (target && Math.random() < moveChance) {
            smartChase(monster, target);
          }
          
          if (monster.aiState === MONSTER_STATES.HOSTILE) {
            turnMonsterToFace(monster, player);
          }
        }
      }

      // 🔍 Line of Sight Check (uses proper wall-blocking raycast)
      function checkLineOfSight(monster, target) {
        // Use the proper hasLineOfSight function that checks for walls
        return hasLineOfSight(monster.x, monster.y, target.x, target.y);
      }

      // Update NetHack-style inventory display
      function updateInventoryDisplay() {
        const inventoryList = document.getElementById("inventory-list");
        if (!inventoryList) return;

        inventoryList.innerHTML = "";

        if (player.inventory.length === 0) {
          const emptyItem = document.createElement("div");
          emptyItem.className = "inventory-item";
          emptyItem.innerHTML =
            '<span class="item-name" style="text-align: center; color: #666;">(empty)</span>';
          inventoryList.appendChild(emptyItem);
          return;
        }

        player.inventory.forEach((item, index) => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "inventory-item";

          // Check if item is equipped
          const isEquipped =
            (item.type === "weapon" && player.equippedWeapon === index) ||
            (item.type === "armor" && player.equippedArmor === index) ||
            (item.type === "ring" && player.ring === index);

          if (isEquipped) {
            itemDiv.classList.add("equipped");
          }

          // NetHack-style item letter (a-z)
          const letter = String.fromCharCode(97 + index); // 'a' + index

          // Format item name and details
          let itemName = item.name || item.type;
          let itemDetails = "";

          if (item.type === "gold") {
            itemName = `${item.amount} gold pieces`;
          } else if (item.type === "potion") {
            itemDetails = ` (+${item.heal}hp)`;
          } else if (item.type === "weapon") {
            itemDetails = ` (+${item.damage}dmg)`;
          } else if (item.type === "armor") {
            itemDetails = ` (AC+${item.ac})`;
          } else if (item.type === "food") {
            itemDetails = ` (${item.nutrition})`;
          } else if (item.type === "wand") {
            itemDetails = ` (${item.charges})`;
          }

          itemDiv.innerHTML = `
            <span class="item-letter">${letter})</span>
            <span class="item-name">${itemName}${itemDetails}</span>
            ${isEquipped ? '<span class="item-count">*</span>' : ""}
          `;

          inventoryList.appendChild(itemDiv);
        });
      }

      function detectionArc(monster) {
        // If monster AI is globally disabled, report no sight to avoid detection-driven state transitions
        if (typeof MONSTER_AI_DISABLED !== 'undefined' && MONSTER_AI_DISABLED) {
          return { sees: false, front: false, side: false, rear: false, angleToPlayer: 0, dist: Infinity };
        }
        // Return whether player is seen by strict arcs
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const dist = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dx, dy);
        let angleDiff = Math.abs(angleToPlayer - monster.facingAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        const dc = TUNING.combat.detection;
        const front = angleDiff <= dc.frontCone && dist <= dc.frontDist; // ~30deg cone by default
        const side =
          angleDiff > dc.frontCone &&
          angleDiff <= dc.sideCone &&
          dist <= dc.sideDist;
        const rear = angleDiff > dc.rearCone && dist <= dc.rearDist;
        // Require line of sight through the tile map to reduce false positives around corners
        const hasLOS = hasLineOfSight(monster.x, monster.y, player.x, player.y);
        return {
          sees: (front || side || rear) && hasLOS,
          front,
          side,
          rear,
          angleToPlayer,
          dist,
        };
      }

      // Pure detection API: returns detection details without mutating state.
      // Use this for unit tests and as the authoritative detection implementation.
  function detectPlayerPure(monster, playerObj, mapSnapshot, cfg) {
        // cfg optional; fallback to global tuning
        const dc = cfg || (TUNING && TUNING.combat && TUNING.combat.detection) || {
          frontCone: Math.PI / 6,
          sideCone: Math.PI / 3,
          rearCone: Math.PI,
          frontDist: 12,
          sideDist: 9,
          rearDist: 0
        };

        if (!monster || !playerObj || !mapSnapshot) return { sees: false, reason: null };

        const dx = playerObj.x - monster.x;
        const dy = playerObj.y - monster.y;
        const dist = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dx, dy);
        let angleDiff = Math.abs(angleToPlayer - monster.facingAngle || 0);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        const front = angleDiff <= dc.frontCone && dist <= dc.frontDist;
        const side = angleDiff > dc.frontCone && angleDiff <= dc.sideCone && dist <= dc.sideDist;
        const rear = angleDiff > dc.sideCone && dist <= (dc.rearDist || 0);

        // Use existing tile LOS helper - no fallback, walls should block detection
        let hasLOS = false;
        try {
          if (typeof hasLineOfSight === 'function') {
            hasLOS = hasLineOfSight(monster.x, monster.y, playerObj.x, playerObj.y);
          }
        } catch (e) { 
          console.warn('Line of sight check failed:', e);
          hasLOS = false; // Default to no line of sight if check fails
        }

        const sees = (front || side || rear) && hasLOS;
        const reason = sees ? (front ? 'vision-front' : (side ? 'vision-side' : 'vision-rear')) : null;
        return { sees, front, side, rear, angleToPlayer, dist, reason, hasLOS };
      }

      // 🧪 COMPREHENSIVE MONSTER AI TEST SUITE - call from console: testMonsterAI()
      function testMonsterAI() {
        console.log('🧪 MONSTER AI COMPREHENSIVE TEST SUITE');
        console.log('=====================================');
        
        // Test 1: Monster Detection
        console.log('\n🔍 TEST 1: Monster Detection');
        debugMonsterDetection();
        
        // Test 2: Force all monsters to different states
        console.log('\n🔄 TEST 2: State Transitions');
        monsters.forEach((monster, index) => {
          const states = [MONSTER_STATES.IDLE, MONSTER_STATES.HOSTILE, MONSTER_STATES.SEARCHING, MONSTER_STATES.ALLY];
          const newState = states[index % states.length];
          console.log(`Setting Monster ${index + 1} to ${newState}`);
          applyMonsterState(monster, newState);
        });
        
        // Test 3: Speed verification
        console.log('\n⚡ TEST 3: Speed Settings');
        console.log('Player Speed:', PLAYER_SPEED_UNITS);
        console.log('Monster Base Speed:', MONSTER_BASE_SPEED_UNITS);
        console.log('Monster Speed Ratio:', MONSTER_SPEED_RATIO);
        console.log('Expected Ratio: 0.75 (75%)', MONSTER_SPEED_RATIO === 0.75 ? '✅' : '❌');
        
        // Test 4: Sound system
        console.log('\n🔊 TEST 4: Sound System');
        console.log('Goblin Alert Sound URL:', GOBLIN_ALERT_SOUND_URL);
        if (monsters.length > 0) {
          console.log('Testing monster alert sound...');
          playMonsterAlertSound(monsters[0]);
        }
        
        // Test 5: Visual indicators
        console.log('\n🎨 TEST 5: Visual Indicators');
        monsters.forEach((monster, index) => {
          console.log(`Monster ${index + 1} visual state:`, monster.aiState);
          updateMonsterVisuals(monster);
        });
        
        console.log('\n✅ TEST SUITE COMPLETE!');
        console.log('Call debugMonsterDetection() for live detection monitoring');
        console.log('Call forceMonsterState(monsterIndex, "HOSTILE") to test specific states');
      }

      // 🎯 Force a specific monster to a specific state - call from console
      function forceMonsterState(monsterIndex, stateName) {
        if (!monsters[monsterIndex]) {
          console.log(`❌ Monster ${monsterIndex} not found`);
          return;
        }
        
        const state = MONSTER_STATES[stateName];
        if (!state) {
          console.log(`❌ State ${stateName} not found. Valid states:`, Object.keys(MONSTER_STATES));
          return;
        }
        
        console.log(`🔧 Forcing Monster ${monsterIndex} to ${stateName}`);
        applyMonsterState(monsters[monsterIndex], state);
        
        if (state === MONSTER_STATES.HOSTILE) {
          monsters[monsterIndex].lastKnownPlayerPos = { x: player.x, y: player.y };
          turnMonsterToFace(monsters[monsterIndex], player);
          playMonsterAlertSound(monsters[monsterIndex]);
        }
      }

      // 🔧 Debug function to test live monster detection - call from console: debugMonsterDetection()
      function debugMonsterDetection() {
        console.log('🔍 LIVE MONSTER DETECTION DEBUG');
        console.log('===============================');
        
        monsters.forEach((monster, index) => {
          const detection = computeMonsterDetection(monster);
          const distance = Math.hypot(player.x - monster.x, player.y - monster.y);
          
          console.log(`Monster ${index + 1}:`, {
            position: `(${monster.x}, ${monster.y})`,
            state: monster.aiState || 'UNDEFINED',
            distance: Math.round(distance * 10) / 10,
            canSee: detection.canSee,
            lineOfSight: detection.los,
            facingAngle: Math.round((monster.facingAngle || 0) * 180 / Math.PI) + '°',
            angleDiff: Math.round((detection.angleDiff || 0) * 180 / Math.PI) + '°',
            inFieldOfView: detection.angleDiff <= (MONSTER_AI_CONFIG.FIELD_OF_VIEW * 0.5),
            withinRange: distance <= MONSTER_AI_CONFIG.LOS_MAX_RANGE
          });
        });
        
        console.log(`Player position: (${player.x}, ${player.y})`);
        console.log(`Player facing: ${Math.round(player.rotationY * 180 / Math.PI)}°`);
      }

      // Runtime test harness for detection logic. Call from the browser console: runMonsterDetectionTests()
      function runMonsterDetectionTests() {
  const tests = [];
        // simple empty map helper
        function emptyMap(w, h) {
          return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ type: TILE.FLOOR, roomId: null })));
        }
        // Monster facing north (angle 0 per codebase conventions)
        const monster = { x: 5, y: 5, facingAngle: 0 };
        const cfg = TUNING && TUNING.combat && TUNING.combat.detection;
        tests.push({ desc: 'Player directly in front within frontDist', player: { x: 5, y: 2 }, expect: true });
        tests.push({ desc: 'Player to side within sideDist', player: { x: 8, y: 5 }, expect: true });
        tests.push({ desc: 'Player behind (no detection)', player: { x: 5, y: 8 }, expect: false });
        const mapSnap = emptyMap(16, 16);
        console.group('Monster detection tests');
        tests.forEach((t, i) => {
          const res = detectPlayerPure(monster, t.player, mapSnap, cfg);
          const pass = !!res.sees === !!t.expect;
          console.log(`${i + 1}. ${t.desc} -> sees: ${res.sees} (dist:${Math.round(res.dist)} reason:${res.reason}) => ${pass ? 'PASS' : 'FAIL'}`);
        });
        console.groupEnd();
        return true;
      }

      function smartChase(monster, target) {
        // Cache and reuse paths until target changes or path is exhausted
        // Fair combat: if HOSTILE, prefer an intercept tile directly in front of the player (no diagonal pokes)
        let desiredTarget = target;
        if (monster.state === "HOSTILE") {
          const fdx = -Math.round(Math.sin(player.rotationY));
          const fdy = -Math.round(Math.cos(player.rotationY));
          const frontX = player.x + fdx;
          const frontY = player.y + fdy;
          const isInside = (x, y) =>
            x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
          const isFree = (x, y) =>
            isInside(x, y) &&
            map[y][x].type !== TILE.WALL &&
            !monsters.some((m) => m !== monster && m.x === x && m.y === y);
          if (isFree(frontX, frontY)) {
            desiredTarget = { x: frontX, y: frontY };
          } else {
            // fall back to any orthogonal adjacent tile next to player that is free
            const orthos = [
              { x: player.x + 1, y: player.y },
              { x: player.x - 1, y: player.y },
              { x: player.x, y: player.y + 1 },
              { x: player.x, y: player.y - 1 },
            ];
            const alt = orthos.find((p) => isFree(p.x, p.y));
            if (alt) desiredTarget = alt;
          }
        }
        const tgtKey = `${desiredTarget.x},${desiredTarget.y}`;
        if (
          !monster.path ||
          !monster.path.length ||
          monster.pathTarget !== tgtKey
        ) {
          monster.path = findPath(
            { x: monster.x, y: monster.y },
            desiredTarget
          );
          monster.pathTarget = tgtKey;
        }
        // Recompute path if stuck in place for a couple turns (blocked by other monsters)
        if (
          monster._lastPosX === monster.x &&
          monster._lastPosY === monster.y
        ) {
          monster.stuckTurns = (monster.stuckTurns || 0) + 1;
        } else {
          monster.stuckTurns = 0;
        }
        monster._lastPosX = monster.x;
        monster._lastPosY = monster.y;
        if ((monster.stuckTurns || 0) >= 2) {
          monster.path = findPath(
            { x: monster.x, y: monster.y },
            desiredTarget
          );
          monster.stuckTurns = 0;
        }
        const tile = map[monster.y]?.[monster.x];
        const isInRoom = tile && tile.roomId && tile.roomId !== "corridor";
        // Cadence rules
        if (monster.state === "SEARCHING") {
          monster._skip = !monster._skip;
          if (monster._skip) return; // 1:2 half speed
        } else if (monster.state === "HOSTILE" && !isInRoom) {
          monster._c3 = (monster._c3 || 0) + 1;
          if (monster._c3 % 3 === 0) return; // 2:3 in corridors
        }
        moveMonsterOnPath(monster);
      }
      function moveMonsterOnPath(monster) {
        if (monster.path && monster.path.length > 1) {
          const nextStep = monster.path[1];
          // If next step is occupied, attempt to refresh path once and skip this turn
          if (
            monsters.some(
              (other) =>
                other !== monster &&
                other.x === nextStep.x &&
                other.y === nextStep.y
            )
          ) {
            // Nudge path to recompute on next tick
            monster.path = findPath(
              { x: monster.x, y: monster.y },
              monster.state === "RETURNING"
                ? monster.spawnPos
                : monster.pathTarget
                ? ((p) => {
                    const [x, y] = p.split(",").map(Number);
                    return { x, y };
                  })(monster.pathTarget)
                : { x: player.x, y: player.y }
            );
            return;
          }
          {
            // Prevent stepping onto the player's tile under all circumstances
            if (nextStep.x === player.x && nextStep.y === player.y) {
              // Try to find an alternate adjacent free tile (orthogonal) to move to instead
              const alternatives = [
                { x: monster.x + 1, y: monster.y },
                { x: monster.x - 1, y: monster.y },
                { x: monster.x, y: monster.y + 1 },
                { x: monster.x, y: monster.y - 1 },
              ];
              const isFree = (x, y) =>
                x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT &&
                map[y][x].type !== TILE.WALL &&
                !monsters.some((m) => m !== monster && m.x === x && m.y === y) &&
                !(x === player.x && y === player.y);
              const alt = alternatives.find(p => isFree(p.x, p.y));
              if (alt) {
                monster.facingAngle = Math.atan2(alt.x - monster.x, alt.y - monster.y);
                monster.x = alt.x;
                monster.y = alt.y;
                monster.object.position.set(monster.x * TILE_SIZE, 0, monster.y * TILE_SIZE);
              } else {
                // No safe alternative - skip move this turn to avoid overlapping the player
                return;
              }
            } else {
              const dx = nextStep.x - monster.x;
              const dy = nextStep.y - monster.y;
              monster.facingAngle = Math.atan2(dx, dy);
              monster.x = nextStep.x;
              monster.y = nextStep.y;
              monster.object.position.set(
                monster.x * TILE_SIZE,
                0,
                monster.y * TILE_SIZE
              );
            }
          }
        }
      }
      function canMonsterAttack(monster, target) {
        // Only orthogonal adjacency (no diagonal), and must be facing within a tight cone
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const manhattan = Math.abs(dx) + Math.abs(dy);
        if (manhattan !== 1) return false; // disallow diagonal or distance > 1
        const angleTo = Math.atan2(dx, dy);
        let d = Math.abs(angleTo - monster.facingAngle);
        if (d > Math.PI) d = 2 * Math.PI - d;
        return d <= TUNING.combat.facingPrecision; // default ~22.5°
      }
      function turnMonsterToFace(monster, target) {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        monster.facingAngle = Math.atan2(dx, dy);
      }
      function checkLineOfSightArc(monster) {
        return detectionArc(monster).sees;
      }

      // 🎨 Enhanced Monster Visual System with Circles and Flashlights
      function updateMonsterVisuals(monster, effect = null) {
        const visuals = monster.object.userData.visuals;
        if (!visuals) return;

        // Handle flash effects
        if (effect === "flash") {
          handleFlashEffect(monster, visuals);
          return;
        }

        // Handle flash counter (blinks from state changes)
        if (monster.flashCounter > 0) {
          handleFlashEffect(monster, visuals);
          monster.flashCounter--;
          if (monster.flashCounter > 0) {
            setTimeout(() => updateMonsterVisuals(monster, "flash"), 300);
          }
        }

        // Update monster circle based on AI state
        updateMonsterCircle(monster, visuals);
        
        // Update arrow direction
        updateMonsterArrow(monster, visuals);
        
        // Update flashlight based on state
        updateMonsterFlashlight(monster, visuals);
        
        // Update orb light
        updateMonsterOrb(monster, visuals);
      }

      // ⚡ Flash Effect Handler
      function handleFlashEffect(monster, visuals) {
        if (visuals.border && visuals.border.material && "emissive" in visuals.border.material) {
          visuals.border.material.emissive.setHex(0xffffff);
          setTimeout(() => {
            visuals.border.material.emissive.setHex(0x000000);
          }, 150);
        }
        
        // Also flash the circle border for enhanced visibility
        if (visuals.circle && visuals.circle.material) {
          const originalColor = visuals.circle.material.color.clone();
          visuals.circle.material.color.setHex(0xffffff);
          setTimeout(() => {
            visuals.circle.material.color.copy(originalColor);
          }, 150);
        }
      }

      // ⭕ Monster Circle System
      function updateMonsterCircle(monster, visuals) {
        if (!visuals.circle) {
          // Create main circle (same size as player circle)
          const circleRadius = TILE_SIZE * 0.4; // Same as player
          const circleGeometry = new THREE.CircleGeometry(circleRadius, 32);
          const circleMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true,
            side: THREE.DoubleSide
          });
          visuals.circle = new THREE.Mesh(circleGeometry, circleMaterial);
          visuals.circle.rotation.x = -Math.PI / 2; // Lay flat on ground
          visuals.circle.position.y = 0.02; // Slightly above ground
          monster.object.add(visuals.circle);
          
          // Add white border (same as player)
          const borderGeometry = new THREE.RingGeometry(
            circleRadius - 0.06,
            circleRadius + 0.06,
            32
          );
          const borderMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide
          });
          visuals.border = new THREE.Mesh(borderGeometry, borderMaterial);
          visuals.border.rotation.x = -Math.PI / 2;
          visuals.border.position.y = 0.025;
          monster.object.add(visuals.border);
        }

        // Clear any half-circle geometries
        if (visuals.halfCircle1) {
          monster.object.remove(visuals.halfCircle1);
          visuals.halfCircle1 = null;
        }
        if (visuals.halfCircle2) {
          monster.object.remove(visuals.halfCircle2);
          visuals.halfCircle2 = null;
        }

        // Update circle color based on AI state
        const material = visuals.circle.material;
        const circleBorderMaterial = visuals.border ? visuals.border.material : null;
        const circleRadius = TILE_SIZE * 0.4;
        
        switch (monster.aiState) {
          case MONSTER_STATES.IDLE:
            material.color.setHex(0xffffff); // Soft White
            material.opacity = 0.85;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xaaaaaa);
            break;
          case MONSTER_STATES.HOSTILE:
            material.color.setHex(0xE81C1C); // Aggressive Red
            material.opacity = 0.92;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xffffff);
            break;
          case MONSTER_STATES.GAMING: // Wager mode
            material.color.setHex(0xFFD700); // Golden Yellow
            material.opacity = 0.9;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xffffff);
            break;
          case MONSTER_STATES.ALLY:
            material.color.setHex(0x00c878); // Green
            material.opacity = 0.85;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xffffff);
            break;
          case MONSTER_STATES.SEARCHING: {
            visuals.circle.visible = false;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xffffff);

            const halfGeo1 = new THREE.CircleGeometry(circleRadius, 16, 0, Math.PI);
            const halfMat1 = new THREE.MeshBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0.85,
              side: THREE.DoubleSide
            });
            visuals.halfCircle1 = new THREE.Mesh(halfGeo1, halfMat1);
            visuals.halfCircle1.rotation.x = -Math.PI / 2;
            visuals.halfCircle1.position.y = 0.02;
            monster.object.add(visuals.halfCircle1);

            const halfGeo2 = new THREE.CircleGeometry(circleRadius, 16, Math.PI, Math.PI);
            const halfMat2 = new THREE.MeshBasicMaterial({
              color: 0xE81C1C,
              transparent: true,
              opacity: 0.85,
              side: THREE.DoubleSide
            });
            visuals.halfCircle2 = new THREE.Mesh(halfGeo2, halfMat2);
            visuals.halfCircle2.rotation.x = -Math.PI / 2;
            visuals.halfCircle2.position.y = 0.02;
            monster.object.add(visuals.halfCircle2);

            const blinkActive = monster._searchBlinkEnd && timeNow() < monster._searchBlinkEnd;
            const blinkVisible = blinkActive ? (Math.floor((monster._searchBlinkEnd - timeNow()) / MONSTER_AI_CONFIG.BLINK_INTERVAL_MS) % 2 === 0) : true;
            if (visuals.halfCircle1) visuals.halfCircle1.visible = blinkVisible;
            if (visuals.halfCircle2) visuals.halfCircle2.visible = blinkVisible;
            break;
          }
          case MONSTER_STATES.GAMING:
            material.color.setHex(0xffd700);
            material.opacity = 0.92;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0x000000);
            break;
          default:
            material.color.setHex(0x000000);
            material.opacity = 0.8;
            visuals.circle.visible = true;
            if (circleBorderMaterial) circleBorderMaterial.color.setHex(0xffffff);
        }

      }

      // ➡️ Monster Arrow System  
      function updateMonsterArrow(monster, visuals) {
        if (!visuals.arrow) {
          // Create arrow if it doesn't exist
          const arrowShape = new THREE.Shape();
          arrowShape.moveTo(0, 0.2);
          arrowShape.lineTo(-0.1, -0.1);
          arrowShape.lineTo(0, 0);
          arrowShape.lineTo(0.1, -0.1);
          arrowShape.closePath();
          
          const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
          const arrowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
          });
          visuals.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
          visuals.arrow.rotation.x = -Math.PI / 2;
          visuals.arrow.position.y = 0.1;
          monster.object.add(visuals.arrow);
        }

        // Update arrow rotation to show facing direction
        const facingAngle = monster.facingAngle || 0;
        visuals.arrow.rotation.z = -facingAngle;
        visuals.arrow.visible = true;
      }

      // 🔦 Monster Flashlight System
      function updateMonsterFlashlight(monster, visuals) {
        const shouldShowLight = monster.aiState === MONSTER_STATES.HOSTILE || 
                               monster.aiState === MONSTER_STATES.SEARCHING;

        if (shouldShowLight) {
          if (!visuals.flashlight) {
            // Create flashlight
            visuals.flashlight = new THREE.SpotLight(0xffffff, 0.5, 10, Math.PI / 6, 0.5);
            visuals.flashlight.position.set(0, 1, 0);
            visuals.flashlight.target = new THREE.Object3D();
            monster.object.add(visuals.flashlight);
            monster.object.add(visuals.flashlight.target);
          }

          visuals.flashlight.visible = true;
          
          // Point flashlight in facing direction
          const facingAngle = monster.facingAngle || 0;
          const fwdX = Math.sin(facingAngle);
          const fwdZ = Math.cos(facingAngle);
          const targetPos = new THREE.Vector3(
            monster.x * TILE_SIZE + fwdX * 5,
            0,
            monster.y * TILE_SIZE + fwdZ * 5
          );
          visuals.flashlight.target.position.copy(targetPos);
          
          // Adjust intensity based on state
          visuals.flashlight.intensity = monster.aiState === MONSTER_STATES.HOSTILE ? 0.7 : 0.4;
        } else {
          if (visuals.flashlight) {
            visuals.flashlight.visible = false;
          }
        }
      }

      // 💡 Monster Orb Light System
      function updateMonsterOrb(monster, visuals) {
        if (!visuals.orb) {
          // Create orb light above monster
          const orbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
          const orbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0x444444,
            transparent: true,
            opacity: 0.3
          });
          visuals.orb = new THREE.Mesh(orbGeometry, orbMaterial);
          visuals.orb.position.set(0, 2, -0.5); // Above and slightly behind
          monster.object.add(visuals.orb);
        }
        
        visuals.orb.visible = true;
        
        // Dim the orb during idle state
        if (monster.aiState === MONSTER_STATES.IDLE) {
          visuals.orb.material.opacity = 0.1;
        } else {
          visuals.orb.material.opacity = 0.3;
        }
      }

      // --- A* Pathfinding ---
      function findPath(start, end) {
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        gScore.set(`${start.x},${start.y}`, 0);
        const fScore = new Map();
        fScore.set(`${start.x},${start.y}`, heuristic(start, end));
        while (openSet.length > 0) {
          openSet.sort(
            (a, b) =>
              (fScore.get(`${a.x},${a.y}`) || Infinity) -
              (fScore.get(`${b.x},${b.y}`) || Infinity)
          );
          const current = openSet.shift();
          const currentKey = `${current.x},${current.y}`;
          if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
          }
          closedSet.add(currentKey);
          getNeighbors(current).forEach((neighbor) => {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) return;
            const tentative_gScore = (gScore.get(currentKey) || 0) + 1;
            if (tentative_gScore < (gScore.get(neighborKey) || Infinity)) {
              cameFrom.set(neighborKey, current);
              gScore.set(neighborKey, tentative_gScore);
              fScore.set(
                neighborKey,
                tentative_gScore + heuristic(neighbor, end)
              );
              if (
                !openSet.some(
                  (node) => node.x === neighbor.x && node.y === neighbor.y
                )
              ) {
                openSet.push(neighbor);
              }
            }
          });
        }
        return [];
      }
      function heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      }
      function getNeighbors(node) {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (Math.abs(dx) === Math.abs(dy)) continue;
            const nx = node.x + dx,
              ny = node.y + dy;
            if (
              nx >= 0 &&
              nx < MAP_WIDTH &&
              ny >= 0 &&
              ny < MAP_HEIGHT &&
              map[ny][nx].type !== TILE.WALL
            ) {
              neighbors.push({ x: nx, y: ny });
            }
          }
        }
        return neighbors;
      }
      function reconstructPath(cameFrom, current) {
        const totalPath = [current];
        let currentKey = `${current.x},${current.y}`;
        while (cameFrom.has(currentKey)) {
          current = cameFrom.get(currentKey);
          totalPath.unshift(current);
          currentKey = `${current.x},${current.y}`;
        }
        return totalPath;
      }

      // --- UI & Input ---
      function logMessage(message, color = "#e0e0e0") {
        // Original message log
        const p = document.createElement("p");
        p.textContent = message;
        p.style.color = color;
        messageLogEl.insertBefore(p, messageLogEl.firstChild);
        if (messageLogEl.children.length > 50)
          messageLogEl.removeChild(messageLogEl.lastChild);
          
        // Adventure log - add message with auto-scroll
        const adventureLog = document.getElementById("dnd-adventure-log");
        if (adventureLog) {
          const adventureP = document.createElement("p");
          adventureP.textContent = message;
          adventureP.style.color = color;
          adventureP.style.margin = "0 0 4px 0";
          adventureLog.appendChild(adventureP);
          adventureLog.scrollTop = adventureLog.scrollHeight;
          
          // Limit adventure log to 100 messages
          if (adventureLog.children.length > 100) {
            adventureLog.removeChild(adventureLog.firstChild);
          }
        }
      }

      function updateUI() {
        // legacy text strip (kept hidden but updated if present)
        const statsDisplay = document.getElementById("dnd-stats-display");
        if (statsDisplay)
          statsDisplay.textContent = `Lvl: ${player.level} (${
            player.exp
          }/${player.expToLevel()}) | HP: ${player.health}/${
            player.maxHealth
          } | STR:${player.str} DEX:${player.dex} CON:${player.con}`;
        // new panel values
        const lvlEl = document.getElementById("stat-level");
        if (lvlEl) lvlEl.textContent = String(player.level);
        
        // Update compass level display
        const compassLevelEl = document.getElementById("compass-level-main");
        if (compassLevelEl) {
          compassLevelEl.textContent = String(player.level).padStart(2, '0');
        }
        
        // Update adventure level display
        const adventureLevelEl = document.getElementById("dnd-adventure-level-num");
        if (adventureLevelEl) {
          adventureLevelEl.textContent = String(player.level).padStart(2, '0');
        }
        
        const hpText = document.getElementById("stat-hp-text");
        if (hpText) hpText.textContent = `${player.health}/${player.maxHealth}`;
        
        // Update compass HP display
        const compassHpEl = document.getElementById("compass-hp-main");
        if (compassHpEl) {
          compassHpEl.textContent = `${player.health}/${player.maxHealth}`;
        }
        const hpBar = document.getElementById("stat-hp-bar");
        if (hpBar) {
          const pct = Math.max(
            0,
            Math.min(
              100,
              Math.round((player.health / Math.max(1, player.maxHealth)) * 100)
            )
          );
          hpBar.style.width = pct + "%";
        }
        const atkEl = document.getElementById("stat-atk");
        if (atkEl) atkEl.textContent = String(player.attack);
        const keyEl = document.getElementById("stat-key");
        if (keyEl) keyEl.textContent = player.hasKey ? "Yes" : "No";

        // NetHack-style attributes
        const strEl = document.getElementById("stat-str");
        if (strEl) strEl.textContent = String(player.str);
        const dexEl = document.getElementById("stat-dex");
        if (dexEl) dexEl.textContent = String(player.dex);
        const conEl = document.getElementById("stat-con");
        if (conEl) conEl.textContent = String(player.con);
        
        // Update adventure view attributes bar
        const attrStrEl = document.getElementById("attr-str");
        if (attrStrEl) attrStrEl.textContent = String(player.str);
        const attrDexEl = document.getElementById("attr-dex");
        if (attrDexEl) attrDexEl.textContent = String(player.dex);
        const attrConEl = document.getElementById("attr-con");
        if (attrConEl) attrConEl.textContent = String(player.con);
        const attrIntEl = document.getElementById("attr-int");
        if (attrIntEl) attrIntEl.textContent = String(player.int || 10);
        const attrWisEl = document.getElementById("attr-wis");
        if (attrWisEl) attrWisEl.textContent = String(player.wis || 10);
        const attrChaEl = document.getElementById("attr-cha");
        if (attrChaEl) attrChaEl.textContent = String(player.cha || 10);
        
        const acEl = document.getElementById("stat-ac");
        if (acEl) acEl.textContent = String(player.ac);
        const killsEl = document.getElementById("stat-kills");
        if (killsEl) killsEl.textContent = String(player.kills);

        // Update NetHack inventory display
        updateInventoryDisplay();

        // XP bar in stats panel
        const xpBar = document.getElementById("stat-xp-bar");
        if (xpBar) {
          const xpPct = Math.max(
            0,
            Math.min(
              100,
              Math.round((player.exp / Math.max(1, player.expToLevel())) * 100)
            )
          );
          xpBar.style.width = xpPct + "%";
        }

        // Compass Health/XP Rings
        const healthPct = player.health / Math.max(1, player.maxHealth);
        const healthColor =
          healthPct > 0.5
            ? "#2f7a3b" /* medium-dark green - matches HP bar */
            : healthPct > 0.25
            ? "#f1c40f"
            : "#e74c3c";
        const xpPct = player.exp / Math.max(1, player.expToLevel());

        document.querySelectorAll(".compass-rose").forEach((c) => {
          c.style.setProperty("--health-percent", `${healthPct * 100}%`);
          c.style.setProperty("--health-color", healthColor);
        });
        document
          .querySelectorAll(".xp-ring")
          .forEach((r) =>
            r.style.setProperty("--xp-percent", `${xpPct * 100}%`)
          );

        // Compass center text
        const levelCoins = document.querySelectorAll(".level-coin");
        levelCoins.forEach((coin) => {
          coin.innerHTML = `XP<br><strong>${
            player.exp
          }/${player.expToLevel()}</strong>`;
        });
        
        // Check for death
        if (player.health <= 0) {
          showDeathModal();
        }
      }
      
      // Death Modal Functions
      function showDeathModal(cause = "You were defeated in combat.") {
        const deathModal = document.getElementById("dnd-game-death-modal");
        const deathCause = document.getElementById("death-cause");
        
        if (deathCause) {
          deathCause.textContent = cause;
        }
        
        if (deathModal) {
          deathModal.classList.remove("hidden");
        }
        
        logMessage("💀 Game Over! " + cause, "#ff4444");
      }
      
      function hideDeathModal() {
        const deathModal = document.getElementById("dnd-game-death-modal");
        if (deathModal) {
          deathModal.classList.add("hidden");
        }
      }
      
      function restartGame() {
        hideDeathModal();
        
        // Reset player state
        player.x = 1;
        player.y = 1;
        player.health = 100;
        player.maxHealth = 100;
        // Reset current tile for NetHack visibility rules
        player.currentTile = map[player.y][player.x];
        player.level = 1;
        player.exp = 0;
        player.str = 15;
        player.dex = 12;
        player.con = 14;
        player.attack = 10;
        player.ac = 0;
        player.kills = 0;
        player.hasKey = false;
        player.rotationY = Math.PI; // 180° rotation to face forward on tactical circle
        player.inventory = [];
        player.wasHit = false;
        
        // Regenerate dungeon
        generateNextGenDungeon();
        
        // Update camera and UI
        syncPlayerPositionToCamera();
        updateUI();
        drawRadar();
        
        logMessage("🔄 Adventure restarted! Welcome back to the dungeon.", "#00e5ff");
        logMessage("Your journey begins anew. May fortune favor you this time!", "#ffffff");
      }
      
      // Helper to grant XP from any event (monster kill, quest completion, etc.)
      function awardXP(amount, message) {
        player.exp = (player.exp || 0) + Math.max(0, amount | 0);
        if (message) logMessage(message, "#9be");
        checkLevelUp();
        updateUI();
      }
      function handleInput(event) {
        // Allow ESC to exit typing mode
        if (event.key === 'Escape') {
          if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
          }
          return;
        }
        // If focused on a text input, only block printable chars; allow arrows/WASD for movement
        const ae = document.activeElement;
        const isText = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
        const printable = event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Tab';
        if (isText && printable) return;

        // --- Automove Interruption ---
        // If any movement key is pressed while automoving, cancel it.
        const moveKeys = [
          "4",
          "6",
          "7",
          "8",
          "9",
        ];
        if (isAutoMoving && moveKeys.includes(event.key)) {
          logMessage("Automove canceled.", "#ffc107");
          autoMoveCancel = true;
          isAutoMoving = false;
          clearAutoTrail();
        }

        switch (event.key) {
          case "w":
          case "ArrowUp":
            GameTurnManager.queuePlayerAction(movePlayer, 1);
            break;
          case "s":
          case "ArrowDown":
            GameTurnManager.queuePlayerAction(movePlayer, -1);
            break;
          case "a":
          case "ArrowLeft":
            // turning is instant and does not consume a turn
            quickTurn(90);
            break;
          case "d":
          case "ArrowRight":
            quickTurn(-90);
            break;
          case "v": // NetHack-style search
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('search', { x: player.x, y: player.y });
              return searchArea();
            });
            break;
          case "f": // NetHack-style attack (forward) — this consumes a turn
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('attack', { x: player.x, y: player.y });
              const dx = -Math.round(Math.sin(player.rotationY));
              const dy = -Math.round(Math.cos(player.rotationY));
              const tx = player.x + dx,
                ty = player.y + dy;
              const target = monsters.find((m) => m.x === tx && m.y === ty);
              if (target) {
                // NetHack-style combat calculation
                let damage = rollDice("1d4"); // Base damage
                
                // Add weapon damage
                if (player.equipment.weapon && player.equipment.weapon.damage) {
                  damage = rollDice(player.equipment.weapon.damage);
                }
                
                // Add strength bonus
                const strBonus = Math.max(-5, Math.min(5, Math.floor((player.str - 10) / 2)));
                damage += strBonus;
                
                // Add equipment enchantment
                if (player.equipment.weapon && player.equipment.weapon.enchantment) {
                  damage += player.equipment.weapon.enchantment;
                }
                
                damage = Math.max(1, damage); // Minimum 1 damage
                attack(player, target, damage);
              } else logMessage("You swing at empty air.", "#a8a8a8");
              return Promise.resolve();
            });
            break;
          // vi-keys: h/j/k/l for left/down/up/right
          case "h":
            quickTurn(90);
            break;
          case "l":
            quickTurn(-90);
            break;
          case "k":
            GameTurnManager.queuePlayerAction(movePlayer, 1);
            break;
          case "j":
            GameTurnManager.queuePlayerAction(movePlayer, -1);
            break;
          // numeric keypad mapping — restrict to orthogonal moves only
          case "2":
            faceAndMove(0, 1);
            break; // down
          case "4":
            faceAndMove(-1, 0);
            break; // left
          case "6":
            faceAndMove(1, 0);
            break; // right
          case "8":
            faceAndMove(0, -1);
            break; // up
          case "g": // pickup/gather items at player tile
            GameTurnManager.queuePlayerAction(() => {
              pickupLootIfAny(player.x, player.y);
              return Promise.resolve();
            });
            break;
          case "i":
            toggleInventory();
            break;
          case ">":
          case ".":
            // prompt before descending
            showDescendModal().catch(() => {});
            break;
          case "e": // NetHack-style eat
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('eat_prompt');
              showEatMenu();
              return Promise.resolve();
            });
            break;
          case "q": // NetHack-style quaff (drink potion)
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('quaff_prompt');
              showQuaffMenu();
              return Promise.resolve();
            });
            break;
          case "r": // NetHack-style read (scroll)
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('read_prompt');
              showReadMenu();
              return Promise.resolve();
            });
            break;
          case "w": // NetHack-style wield weapon
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('wield_prompt');
              showWieldMenu();
              return Promise.resolve();
            });
            break;
          case "W": // NetHack-style wear armor
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('wear_prompt');
              showWearMenu();
              return Promise.resolve();
            });
            break;
          case "t": // NetHack-style take off equipment
            GameTurnManager.queuePlayerAction(() => {
              forensics.logAction('takeoff_prompt');
              showTakeOffMenu();
              return Promise.resolve();
            });
            break;
          case "@": // NetHack-style view character stats
            showCharacterSheet();
            break;
        }
      }

      // Inventory UI toggle and simple inventory listing
      function toggleInventory() {
        const invPanelId = "quick-inventory-panel";
        let panel = document.getElementById(invPanelId);
        if (panel) {
          panel.remove();
          return;
        }
        panel = document.createElement("div");
        panel.id = invPanelId;
        panel.style.position = "absolute";
        panel.style.right = "12px";
        panel.style.top = "12px";
        panel.style.zIndex = 120;
        panel.style.background = "rgba(0,0,0,0.6)";
        panel.style.border = "1px solid rgba(255,255,255,0.08)";
        panel.style.padding = "8px";
        panel.style.borderRadius = "8px";
        panel.style.color = "#e6eef0";
        panel.innerHTML = `<strong>Inventory</strong><div style="max-height:200px;overflow:auto;margin-top:6px"></div>`;
        const list = panel.querySelector("div");
        if (player.inventory.length === 0) list.textContent = "(empty)";
        else
          player.inventory.forEach((it, idx) => {
            const row = document.createElement("div");
            row.style.marginBottom = "6px";
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            const letter = String.fromCharCode("a".charCodeAt(0) + idx);
            const label = it.name || it.type;
            const acts = [];
            if (it.type === "weapon")
              acts.push(
                `<button data-idx="${idx}" data-act="wield" style="margin-left:6px">Wield</button>`
              );
            if (it.type === "potion")
              acts.push(
                `<button data-idx="${idx}" data-act="quaff" style="margin-left:6px">Quaff</button>`
              );
            if (it.type === "food")
              acts.push(
                `<button data-idx="${idx}" data-act="eat" style="margin-left:6px">Eat</button>`
              );
            acts.push(
              `<button data-idx="${idx}" data-act="drop" style="margin-left:6px">Drop</button>`
            );
            row.innerHTML = `<span>[${letter}] ${label}</span><span>${acts.join(
              ""
            )}</span>`;
            row.querySelectorAll("button").forEach((btn) => {
              btn.addEventListener("click", (e) => {
                const idx = Number(e.target.getAttribute("data-idx"));
                const act = e.target.getAttribute("data-act");
                if (act === "wield") {
                  wieldItem(idx);
                } else if (act === "quaff") {
                  quaffItem(idx);
                } else if (act === "eat") {
                  eatFood(idx);
                } else if (act === "drop") {
                  dropItem(idx);
                }
                toggleInventory();
              });
            });
            list.appendChild(row);
          });
        document.body.appendChild(panel);
      }

      function wieldItem(idx) {
        const it = player.inventory[idx];
        if (!it) return;
        if (it.type !== "weapon") {
          logMessage("You cannot wield that.", "#a8a8a8");
          return;
        }
        player.equipment.weapon = it;
        player.inventory.splice(idx, 1);
        player.attack = it.damage || player.attack;
        logMessage(`You wield the ${it.name}.`, "#a8a8a8");
        updateUI();
      }

      function dropItem(idx) {
        const it = player.inventory[idx];
        if (!it) return;
        player.inventory.splice(idx, 1); // spawn loot on ground
        const drop = createLootPileObject(it.visual || it.type, it.name || it.type);
        drop.userData = { items: [it] };
  drop.position.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
  // Keep scene and registry in sync
  addGameObject(`loot_${player.x}_${player.y}`, drop);
        logMessage(`You drop the ${it.name || it.type}.`, "#a8a8a8");
        updateUI();
      }

      function quaffItem(idx) {
        const it = player.inventory[idx];
        if (!it) return;
        if (it.type !== "potion") {
          logMessage("You cannot quaff that.", "#a8a8a8");
          return;
        }
        player.health = Math.min(
          player.maxHealth,
          player.health + (it.heal || 5)
        );
        player.inventory.splice(idx, 1);
        logMessage(`You quaff the ${it.name} and feel better.`, "#9be");
        updateUI();
      }
      function eatFood(idxOrObj) {
        let idx, it;
        if (typeof idxOrObj === 'number') {
          idx = idxOrObj;
          it = player.inventory[idx];
        } else {
          it = idxOrObj;
          idx = player.inventory.indexOf(it);
        }
        
        if (!it) return;
        if (it.type !== "food") {
          logMessage("You cannot eat that.", "#a8a8a8");
          return;
        }
        
        const nutrition = Math.max(1, it.nutrition || 800);
        player.nutrition = Math.min(
          1200,
          (player.nutrition == null ? 900 : player.nutrition) + nutrition
        );
        player.inventory.splice(idx, 1);
        
        const msg = player.nutrition > 900 ? "You are satiated." : "You feel better.";
        logMessage(`You eat the ${getItemDisplayName ? getItemDisplayName(it) : (it.name || "ration")}. ${msg}`, "#9be");
        
        // Food effects (merged from duplicate)
        if (it.effect === "confusion" && Math.random() < 0.3) {
          if (typeof addStatusEffect === 'function') addStatusEffect("confusion", 20);
        }
        
        updateUI();
      }

      function onPlayerTurnTick() {
        // Hunger/starvation disabled: do not decrement nutrition or apply damage
        updateUI();
      }
      function onMouseUp(e) {
        if (e.button === 0) isPanning = false;
        if (e.button === 2) isRotating = false;
      }
      function onMouseWheel(e) {
        if (e.target.closest("#mapview-container")) {
          e.preventDefault();
          desiredZoomLevel += 0.05 * e.deltaY;
          desiredZoomLevel = THREE.MathUtils.clamp(desiredZoomLevel, MIN_ZOOM, MAX_ZOOM);
          zoomLevel = desiredZoomLevel; // instant application
          updateCamera(true);
          const slider = document.getElementById('map-zoom-slider');
          if (slider) slider.value = String(Math.round(desiredZoomLevel));
        }
      }
      function handleResize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Map view
        camera.aspect =
          mapCanvasWrapper.clientWidth / mapCanvasWrapper.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(dpr);
        renderer.setSize(
          mapCanvasWrapper.clientWidth,
          mapCanvasWrapper.clientHeight,
          false
        );
        const fog = document.getElementById("map-fog");
        if (fog) {
          fog.width = mapCanvasWrapper.clientWidth * dpr;
          fog.height = mapCanvasWrapper.clientHeight * dpr;
          fog.style.width = mapCanvasWrapper.clientWidth + "px";
          fog.style.height = mapCanvasWrapper.clientHeight + "px";
        }
        // FPV view
        fpvCamera.aspect =
          fpvViewContainer.clientWidth / fpvViewContainer.clientHeight;
        fpvCamera.updateProjectionMatrix();
        fpvRenderer.setPixelRatio(dpr);
        fpvRenderer.setSize(
          fpvViewContainer.clientWidth,
          fpvViewContainer.clientHeight,
          false
        );
        // Keep keypad above the prompt/compass by syncing the CSS var with actual prompt height
        syncPromptHeightVar();
        positionKeypad();
        updateViewSwap();
      }

      // Sync the CSS variable used to position the keypad above the prompt/compass band
      function syncPromptHeightVar() {
        const prompt = document.getElementById("dnd-fpv-prompt");
        if (!prompt) return;
        const h = Math.round(prompt.getBoundingClientRect().height || 0);
        document.documentElement.style.setProperty(
          "--dnd-panel-height",
          h + "px"
        );
      }

      function positionKeypad() {
        return; // Legacy responsive positioning removed.
        
        console.log('🎯 KEYPAD NOW IN ADVENTURE VIEW');
        
        // Target keypad in adventure view
        const keypad = document.getElementById("dnd-game-movement-overlay");
        const adventureView = document.getElementById("adventure-view");
        
        console.log('Keypad element found:', !!keypad);
        console.log('Adventure view found:', !!adventureView);
        
        if (!keypad) {
          console.error('❌ Keypad not found in adventure view');
          return;
        }
        
        console.log('✅ Keypad is now integrated in Adventure View');
        console.log('📍 Keypad container styles already applied via CSS');
        
        // Compute desired position: bottom of keypad should be 30px above adventure-view top
        try {
          const advRect = adventureView.getBoundingClientRect();
          const keypadRect = keypad.getBoundingClientRect();
          // desired bottom y coordinate = advRect.top - 30
          const desiredBottomY = Math.round(advRect.top - 30);
          // compute top so bottom aligns to desiredBottomY
          let desiredTop = desiredBottomY - Math.round(keypadRect.height);
          // if desiredTop is negative or too close to top, fallback to 12px
          if (!isFinite(desiredTop) || desiredTop < 6) desiredTop = 12;
          // set top relative to viewport (keypad is absolutely positioned inside fpv-viewport)
          keypad.style.top = Math.max(6, Math.round(desiredTop)) + 'px';
          keypad.style.transform = 'translateX(-50%)';
        } catch (e) {
          // ignore measurement errors
          console.warn('positionKeypad measurement failed', e);
          keypad.style.top = '12px';
        }

        // Flag that it rendered
        window.keypadRendered = true;
        console.log('🏁 KEYPAD RENDER FLAG SET - keypadRendered =', window.keypadRendered);
      }
      function handleInteract() {
        triggerDiceSpin();

        GameTurnManager.queuePlayerAction(() => {
          const dx = -Math.round(Math.sin(player.rotationY));
          const dy = -Math.round(Math.cos(player.rotationY));
          const targetX = player.x + dx;
          const targetY = player.y + dy;
          const monster = monsters.find(
            (m) => m.x === targetX && m.y === targetY
          );
          if (monster) {
            monster.state = monster.state === "GAMING" ? "IDLE" : "GAMING";
            logMessage(`You challenge the ${monster.name} to a game!`, "cyan");
            updateMonsterVisuals(monster);
          } else {
            logMessage("You see nothing to interact with.", "#a8a8a8");
          }
          return Promise.resolve();
        });
      }
      function drawRadar() {
        radarAngle = (radarAngle + 0.02) % (Math.PI * 2);
        // include mini keypad radar if present
        const miniCanvas = document.querySelector(".mv-act .radar-mini");
        const miniCtx = miniCanvas ? miniCanvas.getContext("2d") : null;
        const contexts = [radarCtxTop, radarCtxPanel, miniCtx].filter((c) => c);
        const RADAR_RANGE = 20; // tiles

        contexts.forEach((ctx) => {
          const cw = ctx.canvas.width;
          const ch = ctx.canvas.height;
          const center_x = cw / 2;
          const center_y = ch / 2;
          ctx.clearRect(0, 0, cw, ch);

          // Circular clip and background
          ctx.save();
          ctx.beginPath();
          ctx.arc(
            center_x,
            center_y,
            Math.min(center_x, center_y),
            0,
            Math.PI * 2
          );
          ctx.clip();

          const bgGrad = ctx.createRadialGradient(
            center_x,
            center_y,
            0,
            center_x,
            center_y,
            center_x
          );
          bgGrad.addColorStop(0, "rgba(6, 28, 18, 0.96)");
          bgGrad.addColorStop(1, "rgba(2, 12, 8, 0.98)");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, cw, ch);

          // Concentric grid rings
          ctx.strokeStyle = "rgba(140, 220, 170, 0.14)";
          ctx.lineWidth = 1;
          [0.33, 0.66, 0.99].forEach((r) => {
            ctx.beginPath();
            ctx.arc(center_x, center_y, r * center_x, 0, Math.PI * 2);
            ctx.stroke();
          });

          // Tick marks every 10 degrees, larger every 30
          ctx.strokeStyle = "rgba(115, 200, 150, 0.22)";
          for (let deg = 0; deg < 360; deg += 10) {
            const rad = ((deg - 90) * Math.PI) / 180;
            const r1 = center_x * 0.82;
            const r2 = center_x * (deg % 30 === 0 ? 1.0 : 0.93);
            ctx.beginPath();
            ctx.moveTo(
              center_x + Math.cos(rad) * r1,
              center_y + Math.sin(rad) * r1
            );
            ctx.lineTo(
              center_x + Math.cos(rad) * r2,
              center_y + Math.sin(rad) * r2
            );
            ctx.stroke();
          }

          // NSEW labels sized to canvas
          const labelSize = Math.max(8, Math.floor(center_x * 0.35));
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = `${labelSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("N", center_x, center_y - center_x * 0.72);
          ctx.fillText("S", center_x, center_y + center_x * 0.72);
          ctx.fillText("E", center_x + center_x * 0.72, center_y);
          ctx.fillText("W", center_x - center_x * 0.72, center_y);

          // Radar sweep
          const gradient = ctx.createRadialGradient(
            center_x,
            center_y,
            0,
            center_x,
            center_y,
            center_x
          );
          gradient.addColorStop(0, "rgba(95, 200, 120, 0.32)");
          gradient.addColorStop(0.8, "rgba(95, 200, 120, 0.10)");
          gradient.addColorStop(1, "rgba(95, 200, 120, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(center_x, center_y);
          ctx.arc(
            center_x,
            center_y,
            center_x,
            radarAngle - Math.PI / 5,
            radarAngle
          );
          ctx.closePath();
          ctx.fill();

          // Monster blips
          monsters.forEach((m) => {
            let dx = m.x - player.x;
            let dy = m.y - player.y;
            if (Math.hypot(dx, dy) > RADAR_RANGE) return;

            const angle = -player.rotationY;
            const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
            const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

            const canvasX = (rotatedX / RADAR_RANGE) * (cw / 2) + center_x;
            const canvasY = (-rotatedY / RADAR_RANGE) * (ch / 2) + center_y;

            ctx.fillStyle =
              m.state === "HOSTILE" || m.state === "SEARCHING"
                ? "#ff4747"
                : "#f1c40f";
            ctx.beginPath();
            ctx.arc(
              canvasX,
              canvasY,
              Math.max(2, center_x * 0.06),
              0,
              Math.PI * 2
            );
            ctx.fill();
          });
          
          // Flashlight beam indicator
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          // Draw flashlight beam from center forward
          ctx.moveTo(center_x, center_y);
          const beamLength = center_x * 0.7; // 70% of radar radius
          ctx.lineTo(center_x, center_y - beamLength);
          ctx.stroke();
          
          // Draw flashlight cone edges
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1;
          const coneAngle = Math.PI / 8; // Match flashlight angle
          const coneLength = center_x * 0.6;
          ctx.beginPath();
          ctx.moveTo(center_x, center_y);
          ctx.lineTo(
            center_x + Math.sin(coneAngle) * coneLength,
            center_y - Math.cos(coneAngle) * coneLength
          );
          ctx.moveTo(center_x, center_y);
          ctx.lineTo(
            center_x - Math.sin(coneAngle) * coneLength,
            center_y - Math.cos(coneAngle) * coneLength
          );
          ctx.stroke();
          
          ctx.restore();
        });
      }

      // --- Game Loop & Init ---
      // Missing helpers (no-ops or minimal behaviors) to prevent runtime errors
      function initResizeAndDrag() {
        const pip = document.getElementById("mapview-container");
        const mainContainer = document.getElementById("main-container");
        if (!pip) return;

        const MIN_W = 220;
        const MIN_H = 220;

        // Persist PiP position/size across reloads (desktop only)
        function loadPiPState() {
          if (window.innerWidth <= 768) return; // mobile uses sticky full-width
          try {
            const raw = localStorage.getItem("mapPiPState.v1");
            if (!raw) return;
            const s = JSON.parse(raw);
            if (!s || typeof s !== "object") return;
            pip.style.position = "absolute";
            if (typeof s.left === "number") {
              pip.style.left = s.left + "px";
              pip.style.right = "auto";
            }
            if (typeof s.top === "number") pip.style.top = s.top + "px";
            if (typeof s.width === "number")
              pip.style.width = Math.max(MIN_W, s.width) + "px";
            if (typeof s.height === "number")
              pip.style.height = Math.max(MIN_H, s.height) + "px";
          } catch {}
        }
        function savePiPState() {
          if (window.innerWidth <= 768) return;
          const rect = pip.getBoundingClientRect();
          const s = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          try {
            localStorage.setItem("mapPiPState.v1", JSON.stringify(s));
          } catch {}
        }

        // Throttled renderer resize while dragging/resizing
        let _resizeRAF = null;
        const requestViewResize = () => {
          if (_resizeRAF) return;
          _resizeRAF = requestAnimationFrame(() => {
            _resizeRAF = null;
            try {
              handleResize();
            } catch {}
          });
        };

        // Clamp within viewport
        function clampPiPIntoViewport() {
          const rect = pip.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let left = rect.left;
          let top = rect.top;
          let width = rect.width;
          let height = rect.height;
          left = Math.min(Math.max(0, left), Math.max(0, vw - width));
          top = Math.min(Math.max(0, top), Math.max(0, vh - height));
          pip.style.left = left + "px";
          pip.style.top = top + "px";
          pip.style.right = "auto";
        }

        function isPiPActive() {
          // Disable drag/resize only on mobile
          if (window.innerWidth <= 768) return false;
          return true;
        }

        // Dragging the container (avoid when starting on a resize handle)
        let dragging = false;
        let dragStart = { x: 0, y: 0, left: 0, top: 0 };
        pip.addEventListener("mousedown", (e) => {
          if (!isPiPActive()) return;
          if (e.button !== 0) return; // left only
          if (e.target.closest(".resize-handle")) return; // let resize logic handle
          const rect = pip.getBoundingClientRect();
          dragging = true;
          pip.style.willChange = "transform, left, top, width, height";
          pip.style.transition = "none";
          pip.style.cursor = "grabbing";
          pip.style.right = "auto";
          dragStart.x = e.clientX;
          dragStart.y = e.clientY;
          dragStart.left = rect.left;
          dragStart.top = rect.top;
          document.addEventListener("mousemove", onDragMove);
          document.addEventListener("mouseup", onDragEnd, { once: true });
        });
        function onDragMove(e) {
          if (!dragging) return;
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          let nextLeft = dragStart.left + dx;
          let nextTop = dragStart.top + dy;
          // Clamp within viewport while dragging
          const vw = window.innerWidth,
            vh = window.innerHeight;
          const rect = pip.getBoundingClientRect();
          const width = rect.width,
            height = rect.height;
          nextLeft = Math.min(Math.max(0, nextLeft), Math.max(0, vw - width));
          nextTop = Math.min(Math.max(0, nextTop), Math.max(0, vh - height));
          pip.style.left = nextLeft + "px";
          pip.style.top = nextTop + "px";
          requestViewResize();
        }
        function onDragEnd() {
          if (!dragging) return;
          dragging = false;
          pip.style.cursor = "";
          clampPiPIntoViewport();
          savePiPState();
          pip.style.willChange = "";
        }

        // Resizing via handles
        let resizing = false;
        let resizeDir = "";
        let resizeStart = { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0 };
        pip.querySelectorAll(".resize-handle").forEach((handle) => {
          handle.addEventListener("mousedown", (e) => {
            if (!isPiPActive()) return;
            if (e.button !== 0) return;
            e.stopPropagation();
            const rect = pip.getBoundingClientRect();
            resizing = true;
            pip.style.willChange = "transform, left, top, width, height";
            pip.style.transition = "none";
            pip.style.right = "auto";
            resizeStart = {
              x: e.clientX,
              y: e.clientY,
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            };
            if (handle.classList.contains("se")) resizeDir = "se";
            else if (handle.classList.contains("sw")) resizeDir = "sw";
            else if (handle.classList.contains("ne")) resizeDir = "ne";
            else if (handle.classList.contains("nw")) resizeDir = "nw";
            document.addEventListener("mousemove", onResizeMove);
            document.addEventListener("mouseup", onResizeEnd, { once: true });
          });
        });
        function onResizeMove(e) {
          if (!resizing) return;
          const dx = e.clientX - resizeStart.x;
          const dy = e.clientY - resizeStart.y;
          let left = resizeStart.left;
          let top = resizeStart.top;
          let width = resizeStart.width;
          let height = resizeStart.height;
          if (resizeDir.includes("e")) {
            width = Math.max(MIN_W, resizeStart.width + dx);
          }
          if (resizeDir.includes("s")) {
            height = Math.max(MIN_H, resizeStart.height + dy);
          }
          if (resizeDir.includes("w")) {
            width = Math.max(MIN_W, resizeStart.width - dx);
            left = resizeStart.left + dx;
          }
          if (resizeDir.includes("n")) {
            height = Math.max(MIN_H, resizeStart.height - dy);
            top = resizeStart.top + dy;
          }
          // Clamp within viewport during resize
          const vw = window.innerWidth,
            vh = window.innerHeight;
          if (left < 0) {
            width += left;
            left = 0;
          }
          if (top < 0) {
            height += top;
            top = 0;
          }
          width = Math.min(width, vw - left);
          height = Math.min(height, vh - top);
          pip.style.left = left + "px";
          pip.style.top = top + "px";
          pip.style.width = width + "px";
          pip.style.height = height + "px";
          requestViewResize();
        }
        function onResizeEnd() {
          if (!resizing) return;
          resizing = false;
          clampPiPIntoViewport();
          savePiPState();
          pip.style.willChange = "";
        }

        // Keep inside viewport on window resize and when toggling views-swapped
        window.addEventListener("resize", () => {
          if (isPiPActive()) {
            clampPiPIntoViewport();
            requestViewResize();
          }
        });
        loadPiPState();
        // Ensure valid initial bounds
        if (isPiPActive()) clampPiPIntoViewport();
      }
      function initGhostWalls() {
        // Prepare storage for original and see-through materials on the instanced wall mesh
        if (!wallInstancedMesh) return;
        if (!wallInstancedMesh.userData) wallInstancedMesh.userData = {};
        wallInstancedMesh.userData.originalMaterials =
          wallInstancedMesh.material;
        wallInstancedMesh.userData.seeThroughMaterials = null; // deprecated in favor of per-instance hiding
        // Track per-instance hidden state (matrix backups)
        if (!wallInstancedMesh.userData.hiddenInstances)
          wallInstancedMesh.userData.hiddenInstances = new Map();
        wallInstancedMesh.userData.prevHiddenSet = new Set();
      }
      function makeSeeThroughMaterials() {
        if (!wallInstancedMesh) return null;
        if (wallInstancedMesh.userData.seeThroughMaterials)
          return wallInstancedMesh.userData.seeThroughMaterials;
        const original = wallInstancedMesh.userData.originalMaterials;
        const arr = Array.isArray(original) ? original : [original];
        // Clone originals but set to wireframe with low opacity and no depth write so camera "sees through"
        const wire = arr.map((mat) => {
          const m = mat.clone();
          m.wireframe = true;
          m.transparent = true;
          m.opacity = 0.15;
          m.depthWrite = false;
          m.depthTest = false; // always visible outline
          return m;
        });
        wallInstancedMesh.userData.seeThroughMaterials =
          wire.length === 1 ? wire[0] : wire;
        return wallInstancedMesh.userData.seeThroughMaterials;
      }
      // Deprecated material-swap approach kept for fallback, but unused now
      function applySeeThroughWalls() {
        /* no-op: using per-instance hiding */
      }
      function restoreWallMaterials() {
        /* no-op: using per-instance hiding */
      }

      // Hide specific wall instances using multi-mesh awareness
      function hideWallInstances(instanceDataArray) {
        if (!wallInstancedMesh || !wallInstancedMesh.userData?.subMeshes) return;
        const hidden = wallInstancedMesh.userData.hiddenInstances;
        const toKeep = new Set(instanceDataArray.map(d => d.hashKey));

        // Restore any that are no longer in the list
        for (const [hashKey, backup] of hidden.entries()) {
          if (!toKeep.has(hashKey)) {
            backup.mesh.setMatrixAt(backup.id, backup.matrix);
            backup.mesh.instanceMatrix.needsUpdate = true;
            hidden.delete(hashKey);
          }
        }

        // Hide current occluders
        const dummy = new THREE.Object3D();
        const m = new THREE.Matrix4();
        for (const data of instanceDataArray) {
          if (!hidden.has(data.hashKey)) {
            data.mesh.getMatrixAt(data.id, m);
            hidden.set(data.hashKey, { mesh: data.mesh, id: data.id, matrix: m.clone() });
            
            // scale down to effectively invisible for this pass
            dummy.matrix.copy(m);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.setScalar(0.0001);
            dummy.updateMatrix();
            data.mesh.setMatrixAt(data.id, dummy.matrix);
            data.mesh.instanceMatrix.needsUpdate = true;
          }
        }
      }

      function restoreAllHiddenWallInstances() {
        if (!wallInstancedMesh?.userData?.hiddenInstances) return;
        const hidden = wallInstancedMesh.userData.hiddenInstances;
        for (const [hashKey, backup] of hidden.entries()) {
          backup.mesh.setMatrixAt(backup.id, backup.matrix);
          backup.mesh.instanceMatrix.needsUpdate = true;
        }
        hidden.clear();
      }
      function isPlayerOccludedFromCamera() {
        if (!player?.object || !wallInstancedMesh) return false;
        try {
          const raycaster = new THREE.Raycaster();
          const origin = camera.position.clone();
          const target = player.object.position.clone();
          const dir = target.clone().sub(origin).normalize();
          raycaster.set(origin, dir);
          raycaster.far = origin.distanceTo(target);
          const hits = raycaster.intersectObject(wallInstancedMesh, true) || [];
          if (!hits.length) return false;
          const distToPlayer = origin.distanceTo(target);
          return hits[0].distance < distToPlayer - 0.25;
        } catch (_) {
          // Fallback: grid DDA check along ground plane
          try {
            const sx = Math.floor(player.x), sy = Math.floor(player.y);
            const cx = Math.floor(camera.position.x / TILE_SIZE);
            const cy = Math.floor(camera.position.z / TILE_SIZE);
            const dx = Math.sign(sx - cx);
            const dy = Math.sign(sy - cy);
            let x = cx, y = cy;
            let steps = 0;
            while ((x !== sx || y !== sy) && steps++ < 512) {
              if (map[y]?.[x]?.type === TILE.WALL) return true;
              const ex = Math.abs(sx + 0.5 - (x + 0.5));
              const ey = Math.abs(sy + 0.5 - (y + 0.5));
              if (ex > ey) x += dx;
              else y += dy;
            }
            return false;
          } catch { return false; }
        }
      }
      function getOccludingInstanceIds() {
        if (!player?.object || !wallInstancedMesh) return [];
        const raycaster = new THREE.Raycaster();
        const origin = camera.position.clone();
        const target = player.object.position.clone();
        const dir = target.clone().sub(origin).normalize();
        raycaster.set(origin, dir);
        raycaster.far = origin.distanceTo(target) - 0.01;
        const hits = raycaster.intersectObject(wallInstancedMesh, true) || [];
        // Map to unique instanceIds along the line segment to the player
        const instanceDataList = [];
        const seen = new Set();
        for (const h of hits) {
          const id = h.instanceId;
          const hashKey = h.object.uuid + '_' + id;
          if (typeof id === "number" && !seen.has(hashKey)) {
            seen.add(hashKey);
            instanceDataList.push({ mesh: h.object, id: id, hashKey: hashKey });
          }
        }
        return instanceDataList;
      }

      // Fan out a few rays around the player so we hide any walls blocking view near the player, not just the exact center ray
      function getOccludingInstanceIdsFan() {
        if (!player?.object || !wallInstancedMesh) return [];
        const origin = camera.position.clone();
        const center = player.object.position.clone();
        const offsets = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(TILE_SIZE * 0.8, 0, 0),
          new THREE.Vector3(-TILE_SIZE * 0.8, 0, 0),
          new THREE.Vector3(0, 0, TILE_SIZE * 0.8),
          new THREE.Vector3(0, 0, -TILE_SIZE * 0.8),
        ];
        const raycaster = new THREE.Raycaster();
        const seen = new Set();
        const instanceDataList = [];
        for (const off of offsets) {
          const target = center.clone().add(off);
          const dir = target.clone().sub(origin).normalize();
          raycaster.set(origin, dir);
          raycaster.far = origin.distanceTo(target) - 0.01;
          const hits = raycaster.intersectObject(wallInstancedMesh, true) || [];
          for (const h of hits) {
            const id = h.instanceId;
            const hashKey = h.object.uuid + '_' + id;
            if (typeof id === "number" && !seen.has(hashKey)) {
              seen.add(hashKey);
              instanceDataList.push({ mesh: h.object, id: id, hashKey: hashKey });
            }
          }
        }
        return instanceDataList;
      }

      function updateWallGhosting(mapPass = false) {
        if (!player?.object || !wallInstancedMesh) return;
        
        // Enhanced wall and shadow management for different views
        if (mapPass) {
          // Manage wall shadowing in map view
          const tile = map[player.y]?.[player.x];
          const isCorridor = tile && tile.roomId === 'corridor';
          const highPitch = TUNING.map.pitchDeg >= 80;
          
          // For wall ghosting in map view
          if (isCorridor || highPitch) {
            restoreAllHiddenWallInstances();
          } else {
            const ids = getOccludingInstanceIdsFan();
            if (ids.length) hideWallInstances(ids);
            else restoreAllHiddenWallInstances();
          }
          
          // Enhanced shadow settings for map view
          if (typeof mapDirectionalBoost !== 'undefined') {
            mapDirectionalBoost.castShadow = true; // Enable shadows in map view
            
            // Adjust shadow settings for map view
            if (wallInstancedMesh) {
              wallInstancedMesh.castShadow = true;
              wallInstancedMesh.receiveShadow = true;
            }
            
            // Update floor shadow receiving
            if (typeof plane !== 'undefined') {
              plane.receiveShadow = true;
            }
          }
          
          // Make all monster objects cast shadows in map view
          monsters.forEach(monster => {
            if (monster.object) {
              monster.object.traverse(child => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
            }
          });
          
        } else {
          // Restore normal settings for FPV
          restoreAllHiddenWallInstances();
          
          // Return to default shadow settings for FPV
          if (typeof mapDirectionalBoost !== 'undefined') {
            mapDirectionalBoost.castShadow = false;
          }
        }
      }
      function updateViewSwap() {
        // Restore original layout: no automatic swapping/overlay
        const body = document.body;
        const main = document.getElementById("main-container");
        body.classList.remove("map-full");
        if (main) main.classList.remove("views-swapped");
      }
      // Fixed-pitch placement helper for the map camera to avoid angle flips
      function placeMapCameraAt(targetX, targetZ, distance) {
        const pitch = THREE.MathUtils.degToRad((TUNING && TUNING.map && TUNING.map.pitchDeg) || 65);
        const dist = THREE.MathUtils.clamp(distance || zoomLevel || 20, MIN_ZOOM, MAX_ZOOM);
        mapCameraTarget.set(targetX, 0, targetZ);
        mapCameraPosition.set(
          mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
          dist,
          mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
        );
        isMapCameraAnimating = true;
      }
      function focusMapOnRoom(roomId) {
        // No-op: initial/room entry placement handled by updateMapZoomForTile to avoid thrash
        return;
      }
      
      function updateMapZoomForTile(tile) {
        try {
          if (!tile) return;
          
          // Get current map view dimensions
          const mapContainer = document.getElementById("mapview-container");
          if (mapContainer) {
            mapViewWidth = mapContainer.clientWidth;
            mapViewHeight = mapContainer.clientHeight;
          }
          // ENHANCED ZOOM BEHAVIOR:
          // corridors should zoom out and look down from directly above
          if (tile.roomId === "corridor") {
            desiredZoomLevel = Math.max(50, desiredZoomLevel); // Zoom out further for overhead view
            desiredZoomLevel = THREE.MathUtils.clamp(
              desiredZoomLevel,
              MIN_ZOOM,
              MAX_ZOOM
            );
            
            // Set camera to look down from directly above (overhead view)
            if (!userHasPanned) {
              const playerX = player.x * TILE_SIZE;
              const playerZ = player.y * TILE_SIZE;
              mapCameraTarget.set(playerX, 0, playerZ);
              // Position camera directly above the player
              const cameraHeight = desiredZoomLevel;
              mapCameraPosition.set(playerX, cameraHeight, playerZ);
              isMapCameraAnimating = false; // INSTANT: No re-render animation until player exits viewport
            }
          } else {
            // FLUID UI MAPVIEW: Calculate room bounds plus 2 outer tiles to fill viewport
            const roomBounds = calculateRoomBounds(tile.roomId);
            if (roomBounds) {
              // Add 2 tile padding around the room (outer tiles) for better viewport visibility
              const expandedBounds = {
                minX: roomBounds.minX - 2,
                maxX: roomBounds.maxX + 2,
                minZ: roomBounds.minZ - 2,
                maxZ: roomBounds.maxZ + 2
              };
              
              // Calculate dimensions with the expanded bounds
              const roomWidth = (expandedBounds.maxX - expandedBounds.minX + 1) * TILE_SIZE;
              const roomHeight = (expandedBounds.maxZ - expandedBounds.minZ + 1) * TILE_SIZE;
              const maxDimension = Math.max(roomWidth, roomHeight);
              
              // Calculate zoom to fit room perfectly in viewport
              const viewportAspect = mapViewWidth / mapViewHeight;
              const roomAspect = roomWidth / roomHeight;
              
              // Determine the correct zoom based on aspect ratios
              // Guard early if sizes are not yet available
              if (!mapViewWidth || !mapViewHeight) {
                // Defer calculation until map container is measured
                return;
              }
              let paddedSize;
              if (roomAspect > viewportAspect) {
                // Room is wider than viewport - fit width
                paddedSize = roomWidth / 0.95; // Just a bit of padding (5%)
              } else {
                // Room is taller than viewport - fit height
                // Previously multiplied by viewportAspect which skews units.
                // Use height-only padding so camera distance calculation remains consistent.
                paddedSize = roomHeight / 0.95;
              }
              // Debug: emit computed sizing to help diagnose incorrect fits
              try {
                console.log('mapview-fit', { roomId: tile.roomId, roomWidth, roomHeight, mapViewWidth, mapViewHeight, roomAspect, viewportAspect, paddedSize });
              } catch (__) {}
              
              desiredZoomLevel = Math.max(15, paddedSize * 0.5); // Adjust multiplier as needed
              desiredZoomLevel = THREE.MathUtils.clamp(
                desiredZoomLevel,
                MIN_ZOOM,
                Math.min(MAX_ZOOM, 45) // Increased max zoom to allow seeing entire rooms
              );
              
              // Center camera on expanded room center, not just player
              if (!userHasPanned) {
                const roomCenterX = ((expandedBounds.minX + expandedBounds.maxX) / 2) * TILE_SIZE;
                const roomCenterZ = ((expandedBounds.minZ + expandedBounds.maxZ) / 2) * TILE_SIZE;
                mapCameraTarget.set(roomCenterX, 0, roomCenterZ);
              }
            } else {
              // Fallback for rooms without bounds
              desiredZoomLevel = Math.min(
                16,
                desiredZoomLevel || zoomLevel
              ); // Reasonable room view
              desiredZoomLevel = THREE.MathUtils.clamp(
                desiredZoomLevel,
                MIN_ZOOM,
                MAX_ZOOM
              );
            }
          }
          // when changing zoom, if currently not panned, place camera once using fixed pitch helper
          if (!userHasPanned) {
            const hasBounds = tile.roomId !== "corridor" && !!calculateRoomBounds(tile.roomId);
            const tx = hasBounds ? mapCameraTarget.x : player.x * TILE_SIZE;
            const tz = hasBounds ? mapCameraTarget.z : player.y * TILE_SIZE;
            placeMapCameraAt(tx, tz, desiredZoomLevel);
            _zoomCtx = _zoomCtx || {};
            _zoomCtx.lockUntil = performance.now() + 220; // brief lock to avoid ping-pong
          }
        } catch (e) {}
      }
      
      function calculateRoomBounds(roomId) {
        if (!roomId || roomId === "corridor") return null;
        
        let minX = MAP_WIDTH, maxX = 0, minZ = MAP_HEIGHT, maxZ = 0;
        let foundTiles = false;
        
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            if (tile && tile.roomId === roomId && tile.type === TILE.FLOOR) {
              foundTiles = true;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minZ = Math.min(minZ, y);
              maxZ = Math.max(maxZ, y);
            }
          }
        }
        
        return foundTiles ? { minX, maxX, minZ, maxZ } : null;
      }
      
      // === NetHack Menu Systems ===
      
      function showEatMenu() {
        const foods = player.inventory.filter(item => item.type === "food");
        if (foods.length === 0) {
          logMessage("You have no food to eat.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to eat?", "#FFFF00");
        foods.forEach((food, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(food));
          logMessage(`${letter} - ${getItemDisplayName(food)}`, "#FFFFFF");
        });
        
        // For now, auto-eat the first food item (can be enhanced with input later)
        const food = foods[0];
        eatFood(food);
      }
      

      
      function showQuaffMenu() {
        const potions = player.inventory.filter(item => item.type === "potion");
        if (potions.length === 0) {
          logMessage("You have no potions to drink.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to drink?", "#FFFF00");
        potions.forEach((potion, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(potion));
          logMessage(`${letter} - ${getItemDisplayName(potion)}`, "#FFFFFF");
        });
        
        // For now, auto-drink the first potion (can be enhanced with input later)
        const potion = potions[0];
        drinkPotion(potion);
      }
      
      function drinkPotion(potion) {
        const potionIndex = player.inventory.indexOf(potion);
        if (potionIndex === -1) return;
        
        player.inventory.splice(potionIndex, 1);
        identifyItem(potion);
        
        logMessage(`You drink the ${getItemDisplayName(potion)}.`, "#8B00FF");
        
        // Apply potion effects
        switch (potion.effect) {
          case "healing":
            player.health = Math.min(player.maxHealth, player.health + (potion.power || 5));
            logMessage("You feel better!", "#00FF00");
            break;
          case "strength":
            player.str = Math.min(25, player.str + (potion.power || 1));
            logMessage("You feel stronger!", "#FF8800");
            updatePlayerStats();
            break;
          case "speed":
            addStatusEffect("speed", 50, potion.power || 2);
            break;
          case "mana":
            logMessage("You feel magical energy flow through you!", "#0088FF");
            break;
          case "regeneration":
            addStatusEffect("regeneration", 100, potion.power || 1);
            break;
          case "fire_resist":
            addStatusEffect("fire_resistance", 200, potion.power || 1);
            break;
        }
        
        updateUI();
      }
      
      function showReadMenu() {
        const scrolls = player.inventory.filter(item => item.type === "scroll");
        if (scrolls.length === 0) {
          logMessage("You have no scrolls to read.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to read?", "#FFFF00");
        scrolls.forEach((scroll, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(scroll));
          logMessage(`${letter} - ${getItemDisplayName(scroll)}`, "#FFFFFF");
        });
        
        // For now, auto-read the first scroll (can be enhanced with input later)
        const scroll = scrolls[0];
        readScroll(scroll);
      }
      
      function readScroll(scroll) {
        const scrollIndex = player.inventory.indexOf(scroll);
        if (scrollIndex === -1) return;
        
        player.inventory.splice(scrollIndex, 1);
        identifyItem(scroll);
        
        logMessage(`You read the ${getItemDisplayName(scroll)}.`, "#F5DEB3");
        
        // Apply scroll effects
        switch (scroll.effect) {
          case "identify":
            // Identify random unidentified item
            const unidentified = player.inventory.filter(item => {
              const itemKey = `${item.type}_${item.name}`;
              return !player.identifiedItems.has(itemKey);
            });
            if (unidentified.length > 0) {
              const toIdentify = unidentified[Math.floor(Math.random() * unidentified.length)];
              identifyItem(toIdentify);
            } else {
              logMessage("You have no unidentified items.", "#A0A0A0");
            }
            break;
          case "teleport":
            // Random teleportation
            const newX = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
            const newY = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
            if (map[newY] && map[newY][newX] && map[newY][newX].type === TILE.FLOOR) {
              player.x = newX;
              player.y = newY;
              player.object.position.set(newX * TILE_SIZE, 0, newY * TILE_SIZE);
              logMessage("You teleport to a new location!", "#FF00FF");
            }
            break;
          case "healing":
            player.health = player.maxHealth;
            logMessage("You are fully healed!", "#00FF00");
            break;
        }
        
        updateUI();
      }
      
      function showWieldMenu() {
        const weapons = player.inventory.filter(item => item.type === "weapon");
        if (weapons.length === 0) {
          logMessage("You have no weapons to wield.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to wield?", "#FFFF00");
        weapons.forEach((weapon, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(weapon));
          logMessage(`${letter} - ${getItemDisplayName(weapon)}`, "#FFFFFF");
        });
        
        // For now, auto-wield the first weapon (can be enhanced with input later)
        const weapon = weapons[0];
        wieldWeapon(weapon);
      }
      
      function wieldWeapon(weapon) {
        const weaponIndex = player.inventory.indexOf(weapon);
        if (weaponIndex === -1) return;
        
        player.inventory.splice(weaponIndex, 1);
        equipItem(weapon);
      }
      
      function showWearMenu() {
        const armor = player.inventory.filter(item => 
          item.type === "armor" || item.type === "helmet" || 
          item.type === "boots" || item.type === "gauntlets");
        if (armor.length === 0) {
          logMessage("You have no armor to wear.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to wear?", "#FFFF00");
        armor.forEach((piece, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(piece));
          logMessage(`${letter} - ${getItemDisplayName(piece)}`, "#FFFFFF");
        });
        
        // For now, auto-wear the first armor piece (can be enhanced with input later)
        const piece = armor[0];
        wearArmor(piece);
      }
      
      function wearArmor(armor) {
        const armorIndex = player.inventory.indexOf(armor);
        if (armorIndex === -1) return;
        
        player.inventory.splice(armorIndex, 1);
        equipItem(armor);
      }
      
      function showTakeOffMenu() {
        const equipped = Object.values(player.equipment).filter(item => item !== null);
        if (equipped.length === 0) {
          logMessage("You have nothing equipped to take off.", "#A0A0A0");
          return;
        }
        
        logMessage("What would you like to take off?", "#FFFF00");
        equipped.forEach((item, index) => {
          const letter = String.fromCharCode("a".charCodeAt(0) + index);
          logMessage(`${letter} - ${getItemDisplayName(item)}`, "#FFFFFF");
        });
        
        // For now, auto-remove the first equipped item (can be enhanced with input later)
        const item = equipped[0];
        takeOffEquipment(item);
      }
      
      function takeOffEquipment(item) {
        // Find which slot this item is in
        for (const [slot, equippedItem] of Object.entries(player.equipment)) {
          if (equippedItem === item) {
            player.equipment[slot] = null;
            player.inventory.push(item);
            logMessage(`You remove the ${getItemDisplayName(item)}.`, "#FFFF00");
            updatePlayerStats();
            updateUI();
            break;
          }
        }
      }
      
      function showCharacterSheet() {
        logMessage("=== Character Sheet ===", "#00FFFF");
        logMessage(`Level: ${player.level} (${player.exp}/${player.expToLevel()} XP)`, "#FFFFFF");
        logMessage(`Health: ${player.health}/${player.maxHealth}`, "#FF0000");
        logMessage(`Hunger: ${player.hunger}/${player.maxHunger}`, "#00AA00");
        logMessage(`Stats: Str:${player.str} Dex:${player.dex} Con:${player.con} Int:${player.intel} Wis:${player.wis} Cha:${player.cha}`, "#FFFFFF");
        logMessage(`Combat: Attack:${player.attack} AC:${player.ac}`, "#FFAA00");
        logMessage(`Gold: ${player.gold}`, "#FFD700");
        logMessage(`Turns: ${player.turnCount}`, "#A0A0A0");
        
        // Show equipped items
        logMessage("=== Equipment ===", "#00FFFF");
        for (const [slot, item] of Object.entries(player.equipment)) {
          if (item) {
            logMessage(`${slot}: ${getItemDisplayName(item)}`, "#FFFF00");
          } else {
            logMessage(`${slot}: (none)`, "#A0A0A0");
          }
        }
        
        // Show status effects
        if (player.statusEffects.size > 0) {
          logMessage("=== Status Effects ===", "#00FFFF");
          for (const [effect, data] of player.statusEffects.entries()) {
            logMessage(`${effect}: ${data.duration} turns remaining`, "#FF00FF");
          }
        }
      }
      
        console.log('=== INIT FUNCTION START ===');
        
        // Attach Renderers to UI (ensuring FluidUI has created them)
        const mapC = document.getElementById("mapview-container");
        const mapW = mapC ? mapC.querySelector(".canvas-wrapper") : null;
        if (mapW && renderer) {
            console.log('Attaching Map Renderer to:', mapW);
            if (!mapW.contains(renderer.domElement)) mapW.appendChild(renderer.domElement);
        } else {
            console.warn('Map mirror/canvas-wrapper not found in DOM during init()');
        }

        const fpvC = document.getElementById("fpv-viewport");
        if (fpvC && fpvRenderer) {
            console.log('Attaching FPV Renderer to:', fpvC);
            if (!fpvC.contains(fpvRenderer.domElement)) fpvC.appendChild(fpvRenderer.domElement);
        } else {
            console.warn('FPV viewport not found in DOM during init()');
        }



        console.log('THREE available:', typeof THREE !== 'undefined');
        console.log('Scene:', !!scene);
        console.log('Camera:', !!camera);
        console.log('Renderer:', !!renderer);
        console.log('mapview-container:', !!document.getElementById('mapview-container'));
        console.log('fpv-viewport:', !!document.getElementById('fpv-viewport'));
        
        // === KEYPAD RENDER STATUS DEBUG ===
        setTimeout(() => {
          console.log('🎯 KEYPAD STATUS CHECK:');
          const keypad = document.getElementById('dnd-game-movement-overlay');
          console.log('Movement overlay found:', !!keypad);
          console.log('Keypad render flag:', window.keypadRendered);
          
          if (keypad) {
            const rect = keypad.getBoundingClientRect();
            const styles = window.getComputedStyle(keypad);
            console.log('📍 Keypad position and visibility:', {
              display: styles.display,
              visibility: styles.visibility,
              position: styles.position,
              top: styles.top,
              left: styles.left,
              zIndex: styles.zIndex,
              bounds: rect
            });
          } else {
            console.error('❌ Keypad (dnd-game-movement-overlay) not found!');
          }
        }, 2000);
        
        // Check adventure game UI
        const adventureContainer = document.getElementById('dnd-game-app-container');
        console.log('Adventure game container:', !!adventureContainer);
        if (adventureContainer) {
          const adventureStyles = window.getComputedStyle(adventureContainer);
          console.log('Adventure container styles:', {
            display: adventureStyles.display,
            visibility: adventureStyles.visibility,
            opacity: adventureStyles.opacity,
            zIndex: adventureStyles.zIndex
          });
        }
        
        // Check if renderer has been appended to DOM
        const mapContainer = document.getElementById('mapview-container');
        if (mapContainer) {
          console.log('Mapview children count:', mapContainer.children.length);
          const mapStyles = window.getComputedStyle(mapContainer);
          console.log('Mapview container styles:', {
            display: mapStyles.display,
            visibility: mapStyles.visibility,
            width: mapStyles.width,
            height: mapStyles.height,
            position: mapStyles.position
          });
          if (renderer && renderer.domElement) {
            console.log('Renderer domElement exists:', !!renderer.domElement);
            console.log('Renderer parent:', renderer.domElement.parentElement?.id || 'no parent');
          }
        }
        
        initResizeAndDrag();
        initGhostWalls();
        window.addEventListener("keydown", handleInput);
        window.addEventListener("contextmenu", (e) => e.preventDefault());
        window.addEventListener("resize", handleResize);
  camera.layers.set(0);
  fpvCamera.layers.set(FPV_MODEL_LAYER); // Only FPV layer to avoid double walls
  // fpvCamera.layers.enable(0); // REMOVED: this was causing double walls
  console.log('🔧 FPV Camera configured to see only FPV_MODEL_LAYER');
        generateNextGenDungeon();
        logMessage(
          "The underworld dojo awaits. Descend seven levels.",
          "#87ceeb"
        );
        setCompassHeading(player.rotationY);
        attachClickToMoveFPV();
        attachClickToMoveMap(); // Add click-to-move for map view

        // Ensure renderer is properly sized after DOM layout
        setTimeout(() => {
          handleResize();
          console.log("Forced resize after initialization");
        }, 100);

        animate();
        // Enforce initial view-swap state
        updateViewSwap();
        // Player model loading removed per user request
        
        // Debug: Add keyboard shortcut to focus map on player (F key)
        document.addEventListener('keydown', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          
          if (e.code === 'Space') {
             e.preventDefault(); // Stop page scrolling
             window.fpvSelfieMode = !window.fpvSelfieMode;
             updateCamera(true);
             return;
          }
          if (e.key === 'f' || e.key === 'F') {
            console.log("Manual map focus triggered");
            focusMapOnPlayer();
          }
        });
        
        // Initial keypad placement + observe prompt
        try {
          positionKeypad();
        } catch {}
        try {
          const prompt = document.getElementById("dnd-fpv-prompt");
          if (window.ResizeObserver && prompt) {
            const ro = new ResizeObserver(() => positionKeypad());
            ro.observe(prompt);
          }
        } catch {}

        // Wire up loot modal buttons (single handlers)
        try {
          const lootGet = document.getElementById("loot-get-btn");
          const lootCancel = document.getElementById("loot-cancel-btn");
          if (lootGet) {
            lootGet.addEventListener("click", () => {
              if (!lootModalOpen) return;
              pickupLootIfAny(player.x, player.y);
              hideLootModal();
              lootModalOpen = false;
            });
          }
          if (lootCancel) {
            lootCancel.addEventListener("click", () => {
              hideLootModal();
              lootModalOpen = false;
            });
          }
        } catch (e) {}

        // initialize desired zoom based on starting tile
        try {
          const startTile = map[player.y] && map[player.y][player.x];
          if (typeof updateMapZoomForTile === 'function') {
            updateMapZoomForTile(startTile);
          }
        } catch (e) {}


        // Initialize forensic sync analyzer
        console.log('🔍 Initializing Forensic Sync System...');
        initializeForensicSystem();

        // Expose Dev tuning API for quick tweaking in console
        window.Dev = {
          forensic: {
            scan: () => {
              if (window.forensicSync) {
                window.forensicSync.performFullAnalysis();
              } else {
                console.warn('Forensic system not initialized');
              }
            },
            autoFix: (enabled) => {
              if (window.forensicSync) {
                if (enabled) {
                  window.forensicSync.enableAutoFix();
                } else {
                  window.forensicSync.disableAutoFix();
                }
              }
            },
            debug: () => {
              if (window.forensicSync) {
                window.forensicSync.toggleDebugMode();
              }
            },
            status: () => {
              if (window.forensicSync) {
                return window.forensicSync.getStatus();
              }
              return null;
            },
            forceMonsterCheck: () => {
              console.log('🔍 Forcing monster visibility check...');
              if (monsterObject) {
                console.log('Monster object exists:', monsterObject);
                console.log('Monster in scene:', scene.children.includes(monsterObject));
                console.log('Monster position:', monsterObject.position);
                console.log('Monster children:', monsterObject.children);
                monsterObject.children.forEach((child, i) => {
                  console.log('Child ' + i + ':', child.type, 'Layers:', child.layers, 'Visible:', child.visible);
                });
              } else {
                console.warn('No monster object found - creating one...');
                createMonsterForTuning();
              }
            },
            forceFullSync: () => {
              console.log('🔄 Forcing full object synchronization...');
              
              // Fix camera layers first
              if (window.forensicSync) {
                window.forensicSync.checkAndFixCameraLayers();
              }
              
              // Force all scene objects to have proper layer assignments
              let fixedCount = 0;
              scene.traverse((object) => {
                if (object.isMesh && object.visible) {
                  const wasOnLayer0 = object.layers.test(0);
                  const wasOnFPVLayer = object.layers.test(1);
                  
                  // Skip floors, walls, ceilings, UI elements
                  if (!object.userData.isFloor && 
                      !object.userData.isWall && 
                      !object.userData.isCeiling && 
                      !object.userData.isUI) {
                    
                    // Ensure objects are on both layers
                    if (!wasOnLayer0) {
                      object.layers.enable(0);
                      fixedCount++;
                    }
                    if (!wasOnFPVLayer) {
                      object.layers.enable(1);
                      fixedCount++;
                    }
                  }
                }
              });
              
              console.log('✅ Fixed layer assignments for', fixedCount, 'objects');
              
              // Run forensic scan
              if (window.forensicSync) {
                window.forensicSync.performFullAnalysis();
              }
            }
          },
          lights: {
            headlamp: (opts = {}) => {
              Object.assign(TUNING.lighting.headlamp, opts);
              // Headlamp removed
              logMessage("Headlamp disabled (no-op)", "#9be");
            },
            playerFill: (opts = {}) => {
              Object.assign(TUNING.lighting.playerFill, opts);
              applyPlayerFillTuning(playerLight);
              logMessage("Player fill updated", "#9be");
            },
            monster: (opts = {}) => {
              Object.assign(TUNING.lighting.monsterFlashlight, opts);
              // Monster flashlights removed
              logMessage("Monster flashlights disabled (no-op)", "#9be");
            },
            orb: (opts = {}) => {
              Object.assign(TUNING.lighting.monsterOrb, opts);
              monsters.forEach((m) =>
                applyMonsterOrbTuning(m?.object?.userData?.visuals?.orb)
              );
              logMessage("Monster orbs updated", "#9be");
            },
            exposure: (fpvExp, mapExp) => {
              if (typeof fpvExp === "number")
                fpvRenderer.toneMappingExposure = fpvExp;
              if (typeof mapExp === "number")
                renderer.toneMappingExposure = mapExp;
            },
          },
          combat: {
            detection: (opts = {}) => {
              Object.assign(TUNING.combat.detection, opts);
              logMessage("Detection arcs updated", "#9be");
            },
            facing: (rad) => {
              if (typeof rad === "number") TUNING.combat.facingPrecision = rad;
              logMessage("Facing precision updated", "#9be");
            },
          },
          movement: {
            cameraOffset: (opts = {}) => {
              Object.assign(TUNING.movement.fpvCameraOffset, opts);
              logMessage("FPV camera offset updated", "#9be");
            },
          },
          models: {
            refitPlayer: (height) => {
              if (typeof height === "number")
                TUNING.models.playerHeight = height;
              const pm = player?.object?.userData?.visuals?.model3d;
              if (pm)
                fitToHeightAndGround(pm, TUNING.models.playerHeight, 0.02);
              logMessage("Player model refit", "#9be");
            },
            refitMonsters: (height) => {
              if (typeof height === "number")
                TUNING.models.monsterHeight = height;
              monsters.forEach((m) => {
                const mm = m?.object?.userData?.visuals?.model3d;
                if (mm)
                  fitToHeightAndGround(mm, TUNING.models.monsterHeight, 0.0);
              });
              logMessage("Monster models refit", "#9be");
            },
          },
        };
      }
      function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        
        // Always check if player is visible in map view - !IMPORTANT
        ensureMapAutoCenter();
        
        if (
          player.object &&
          !player.object.quaternion.equals(playerTargetRotation)
        ) {
          player.object.quaternion.slerp(playerTargetRotation, 8 * delta);
        }

        // --- Animate monster turning ---
        for (const monster of monsters) {
          if (!monster.object) continue;
          // Let AI set facingAngle; only apply smooth rotation here
          const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            monster.facingAngle || 0
          );
          if (!monster.object.quaternion.equals(targetQuaternion)) {
            monster.object.quaternion.slerp(targetQuaternion, 8 * delta);
          }
        }

        if (isPlayerAnimating || game._moveTween) {
          bobIntensity = Math.min(bobIntensity + delta * 8.0, 1.0);
          fpvBobPhase += delta * 15.0; // Bob frequency
        } else {
          bobIntensity = Math.max(bobIntensity - delta * 8.0, 0.0);
          if (bobIntensity > 0) fpvBobPhase += delta * 15.0;
          else fpvBobPhase = 0;
        }

        if (isPlayerAnimating) {
          playerAnimTime += delta;
          const progress = Math.min(playerAnimTime / PLAYER_ANIMATION_SPEED, 1);
          player.object.position.lerpVectors(
            playerStartPos,
            playerTargetPos,
            progress
          );
          if (progress >= 1) {
            isPlayerAnimating = false;
            
            // Clear movement tween when completed
            game._moveTween = null;
          }
        }
        // Aim player headlamp with facing
        if (player?.object?.userData?.visuals?.headlamp) {
          // 180° flipped forward vector to match requested orientation
          const fwd = new THREE.Vector3(
            -Math.sin(player.rotationY),
            0,
            -Math.cos(player.rotationY)
          ).multiplyScalar(10);
          const base = player.object.position
            .clone()
            .add(new THREE.Vector3(0, 1.6, 0));
          const target = base.clone().add(fwd);
          player.object.userData.visuals.headlamp.target.position.copy(target);
          // Update flashlight target
          if (player.object.userData.visuals.flashlightTarget) {
            player.object.userData.visuals.flashlightTarget.position.copy(target);
          }
        }
        
        // --- Animate rotating loot items and billboard labels ---
        gameObjects.forEach((obj, key) => {
          if (key.startsWith('loot_')) {
            if (obj.userData.mainMesh && obj.userData.mainMesh.userData.shouldRotate) {
              obj.userData.mainMesh.rotation.y += delta * 2; // Rotate coins and other spinning items
            }
            if (obj.userData.labelMesh && obj.userData.labelMesh.userData.billboardToFPV) {
              // Face label toward FPV camera only; map pass remains readable due to DoubleSide
              obj.userData.labelMesh.lookAt(fpvCamera.position);
            }
          }
        });
        
        updateCamera();
        
        // Control FPV player walking animation (001.E style hierarchy)
        try {
          const playerObj = player.object;
          if (playerObj && playerObj.userData.visuals.model3dFPV) {
            const fpvAvatar = playerObj.userData.visuals.model3dFPV; // This is the FPV avatar container
            const glbRoot = fpvAvatar.getObjectByName && fpvAvatar.getObjectByName('playerFPVAvatarModel');
            
            if (glbRoot && glbRoot.userData && glbRoot.userData.walkAction) {
              const now = performance.now();
              const start = game._walkAnimStart || 0;
              const elapsed = now - start;
              const dur = (game._moveTween && game._moveTween.dur) || (PLAYER_ANIMATION_SPEED * 1000);
              const ud = glbRoot.userData;
              const action = ud.walkAction;
              
              if (elapsed >= 0 && elapsed <= dur && (isPlayerAnimating || game._moveTween)) {
                if (!ud.walking) {
                  try {
                    // Sync action speed to tween duration (001.E approach)
                    const clipDur = Math.max(0.0001, ud.walkClipDuration || 1.0);
                    action.timeScale = clipDur > 0 ? (clipDur / (dur / 1000)) : 1.0;
                    action.reset();
                    action.play();
                    ud.walking = true;
                  } catch(_) {}
                }
                // Update mixer only when walking
                if (ud.mixer) ud.mixer.update(delta);
              } else {
                if (ud.walking) {
                  try { 
                    action.stop(); 
                    ud.walking = false;
                  } catch(_) {}
                }
              }
            }
          }
        } catch (e) {
          // Silent fail for FPV animation control
        }

        // Control map view player walking animation (001.E style hierarchy)
        try {
          const playerObj = player.object;
          if (playerObj && playerObj.userData.visuals.mapModel) {
            const avatar = playerObj.userData.visuals.mapModel; // This is the avatar container
            const glbRoot = avatar.getObjectByName && avatar.getObjectByName('playerAvatarModel');
            
            if (glbRoot && glbRoot.userData && glbRoot.userData.walkAction) {
              const now = performance.now();
              const start = game._walkAnimStart || 0;
              const elapsed = now - start;
              const dur = (game._moveTween && game._moveTween.dur) || (PLAYER_ANIMATION_SPEED * 1000);
              const ud = glbRoot.userData;
              const action = ud.walkAction;
              
              if (elapsed >= 0 && elapsed <= dur && (isPlayerAnimating || game._moveTween)) {
                if (!ud.walking) {
                  try {
                    // Sync action speed to tween duration (001.E approach)
                    const clipDur = Math.max(0.0001, ud.walkClipDuration || 1.0);
                    action.timeScale = clipDur > 0 ? (clipDur / (dur / 1000)) : 1.0;
                    action.reset();
                    action.play();
                    ud.walking = true;
                  } catch(_) {}
                }
                // Update mixer only when walking
                if (ud.mixer) ud.mixer.update(delta);
              } else {
                if (ud.walking) {
                  try { 
                    action.stop(); 
                    ud.walking = false;
                  } catch(_) {}
                }
              }
            }
          }
        } catch (e) {
          // Silent fail for map model animation control
        }
        
        // Update global animation mixer disabled - we handle player animations explicitly above
        // if (animationMixer) animationMixer.update(delta);
        
        drawRadar();
        try {
          updateDOF(delta);
        } catch (e) {}

        // --- MAP VIEW RENDER PASS ---
        updateWallGhosting(true); // Ghost walls for map view
        
        // Apply map view scaling to monster models
        monsters.forEach(monster => {
          if (monster.object && monster.object.userData.visuals.model3d) {
            const model = monster.object.userData.visuals.model3d;
            if (model.userData.viewScaling) {
              const scaling = model.userData.viewScaling;
              const targetScale = scaling.mapScale / scaling.currentScale;
              model.scale.multiplyScalar(targetScale);
              scaling.currentScale = scaling.mapScale;
            }
          }
        });

        // Debug: Log render calls occasionally
        if (DEBUG_RENDER_LOGS && Math.random() < 0.01) {
          // 1% chance to log
          console.log("Rendering map view:", {
            camera_position: camera.position,
            camera_target: mapCameraTarget,
            scene_children: scene.children.length,
          });
        }

  // Disable scene fog for the map pass so zoomed-out corridors stay bright
  const __prevFog = scene.fog;
  scene.fog = null;
  renderer.render(scene, camera);
  scene.fog = __prevFog;
        // Map flashlight overlay removed
        updateWallGhosting(false); // Restore walls after map view

        // --- FPV RENDER PASS ---
        
        // Apply FPV view scaling to monster models
        monsters.forEach(monster => {
          if (monster.object && monster.object.userData.visuals.model3d) {
            const model = monster.object.userData.visuals.model3d;
            if (model.userData.viewScaling) {
              const scaling = model.userData.viewScaling;
              const targetScale = scaling.fpvScale / scaling.currentScale;
              model.scale.multiplyScalar(targetScale);
              scaling.currentScale = scaling.fpvScale;
            }
          }
        });
        
        // Cinematic: add a subtle breathing pulse to FPV rim light
        try {
          const t = performance.now() * 0.0015;
          if (typeof rimLight !== 'undefined' && rimLight) {
            rimLight.intensity = 0.22 + Math.sin(t) * 0.04; // subtle 0.18-0.26 pulse
          }
          
          // Cinematic shadows: animate the map view dramatic light for dynamic shadows
          if (typeof mapDramaticSideLight !== 'undefined' && mapDramaticSideLight) {
            // Slower movement for the cinematic map light
            const mapLightT = performance.now() * 0.0005;
            // Circular motion pattern for interesting shadow movement
            const radius = 15;
            const height = 40 + Math.sin(mapLightT * 0.5) * 5; // subtle height variation
            
            mapDramaticSideLight.position.x = Math.sin(mapLightT) * radius;
            mapDramaticSideLight.position.z = Math.cos(mapLightT) * radius;
            mapDramaticSideLight.position.y = height;
            
            // Subtle intensity changes for more dynamic feeling
            mapDramaticSideLight.intensity = 0.35 + Math.sin(mapLightT * 0.7) * 0.08;
          }
        } catch {}

        fpvRenderer.render(scene, fpvCamera);

        updateFPS();
      }

      // Origami Dungeon Radar integration
      function initializeRadar() {
        const indicator = document.getElementById("radar-indicator");
        if (!indicator) {
          console.error(
            "Radar indicator element not found. Make sure the radar HTML is in the DOM."
          );
          return;
        }
        window.setRadarDirection = function (direction) {
          let angle = 0;
          switch (String(direction).toUpperCase()) {
            case "N":
              angle = 0;
              break;
            case "E":
              angle = 90;
              break;
            case "S":
              angle = 180;
              break;
            case "W":
              angle = 270;
              break;
            default:
              console.warn(
                `Invalid radar direction: ${direction}. Defaulting to 'N'.`
              );
              angle = 0;
          }
          indicator.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        };
        const ticksContainer = document.getElementById("all-ticks");
        if (ticksContainer) {
          let ticksHtml = "";
          for (let i = 0; i < 360; i += 5) {
            let id = "micro-tick";
            if (i % 90 === 0) {
              id = "major-tick";
            } else if (i % 30 === 0) {
              id = "mid-tick";
            } else if (i % 10 === 0) {
              id = "minor-tick";
            }
            ticksHtml += `<use href="#${id}" transform="rotate(${i}, 87.5, 87.5)"/>`;
          }
          ticksContainer.innerHTML = ticksHtml;
        } else {
          console.error("Radar ticks container element not found.");
        }
      }
      document.addEventListener("DOMContentLoaded", initializeRadar);

      // drawMapLightOverlay removed

      // Helper: face an absolute grid direction and attempt one step move
      function faceAndMove(dx, dy) {
        // compute angle matching movePlayer coordinate system (align with monster facing convention)
        const angle = Math.atan2(dx, dy);
        player.rotationY = angle;
        if (player.object)
          player.object.quaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            player.rotationY
          );
        GameTurnManager.queuePlayerAction(movePlayer, 1);
      }

      function showHelpModal() {
        if (document.getElementById("help-modal"))
          return (document.getElementById("help-modal").style.display =
            "block");
        const modal = document.createElement("div");
        modal.id = "help-modal";
        modal.style.position = "fixed";
        modal.style.left = "8%";
        modal.style.top = "8%";
        modal.style.width = "84%";
        modal.style.height = "84%";
        modal.style.zIndex = 9999;
        modal.style.background =
          "linear-gradient(180deg, rgba(8,8,10,0.96), rgba(2,2,2,0.96))";
        modal.style.border = "1px solid rgba(255,255,255,0.06)";
        modal.style.padding = "16px";
        modal.style.borderRadius = "12px";
        modal.style.color = "#e6eef0";
        modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>NetHack-like Help</strong><button id="help-close" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer">✕</button></div><div style="overflow:auto;height:calc(100% - 40px);line-height:1.4"><pre style="white-space:pre-wrap">Movement: arrows / WASD / vi-keys (h/j/k/l)\nNumpad: 7-8-9 / 4-5-6 / 1-2-3 for diagonal moves\nTurn: A/D or arrow-left/right (instant)\nMove forward/back: W/S or up/down\nAttack: f (forward)\nPick up: g\nInventory: i\nWield: wield <index|letter>\nDrop: drop <index|letter>\nQuaff (drink): quaff <index|letter>\nEat: eat <index|letter>\nSearch: space\nDescend stairs: > or .\nQuick commands: 'help', 'inventory', 'stats', 'pickup'\nCommands can also be typed in the prompt. Type 'help' to show this dialog.\n</pre></div>`;
        document.body.appendChild(modal);
        document
          .getElementById("help-close")
          .addEventListener("click", () => modal.remove());
      }
      // Neumorphic Descend/Ascend confirmation modal. If player is standing on stairs,
      // this modal appears and OK (Enter/Space) accepts and queues descendStairs().
      function showDescendModal(directionHint) {
        if (document.getElementById("descend-modal")) return Promise.resolve();
        return new Promise((resolve) => {
          const modal = document.createElement("div");
          modal.id = "descend-modal";
          modal.style.position = "fixed";
          modal.style.left = "50%";
          modal.style.top = "50%";
          modal.style.transform = "translate(-50%,-50%)";
          modal.style.zIndex = 99999;
          modal.style.width = "320px";
          modal.style.maxWidth = "90%";
          modal.style.padding = "18px";
          modal.style.borderRadius = "12px";
          modal.style.background = "linear-gradient(145deg,#0f1214,#191b1e)";
          modal.style.boxShadow =
            "8px 8px 20px rgba(0,0,0,0.6), -6px -6px 14px rgba(255,255,255,0.02) inset";
          modal.style.color = "#fff";
          modal.innerHTML =
            `<div style="font-weight:700;font-size:16px;margin-bottom:8px">` +
            (directionHint === "up" ? "Ascend stairs?" : "Descend stairs?") +
            `</div><div style="font-size:13px;color:rgba(255,255,255,0.85);margin-bottom:14px">Are you sure you want to ${
              directionHint === "up" ? "ascend" : "descend"
            } the stairs?</div>`;

          const btnRow = document.createElement("div");
          btnRow.style.display = "flex";
          btnRow.style.justifyContent = "flex-end";
          btnRow.style.gap = "8px";

          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "N";
          cancelBtn.title = "N - Cancel";
          cancelBtn.className = "qa";
          cancelBtn.style.padding = "8px 12px";

          const okBtn = document.createElement("button");
          okBtn.textContent = "OK";
          okBtn.title = "Enter/Space - Confirm";
          okBtn.className = "qa";
          okBtn.style.padding = "8px 12px";

          btnRow.appendChild(cancelBtn);
          btnRow.appendChild(okBtn);
          modal.appendChild(btnRow);
          document.body.appendChild(modal);

          function cleanup() {
            document.removeEventListener("keydown", onKey);
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
          }

          function onOk() {
            cleanup();
            // queue descend or ascend action on the game turn manager
            if (directionHint === "up")
              GameTurnManager.queuePlayerAction(ascendStairs);
            else GameTurnManager.queuePlayerAction(descendStairs);
            resolve(true);
          }
          function onCancel() {
            cleanup();
            resolve(false);
          }

          // Wire up loot modal buttons (single handlers, avoid duplicates)
          const lootGet = document.getElementById("loot-get-btn");
          const lootCancel = document.getElementById("loot-cancel-btn");
          if (lootGet) {
            lootGet.addEventListener("click", () => {
              pickupLootIfAny(player.x, player.y);
              hideLootModal();
            });
          }
          if (lootCancel) {
            lootCancel.addEventListener("click", () => hideLootModal());
          }
          function onKey(e) {
            function hideLootModal() {
              const el = document.getElementById("loot-modal");
              if (el) el.classList.add("hidden");
            }
            if (e.code === "Enter" || e.code === "Space") {
              e.preventDefault();
              onOk();
            } else if (e.key && e.key.toLowerCase() === "n") {
              e.preventDefault();
              onCancel();
            }
          }

          okBtn.addEventListener("click", onOk);
          cancelBtn.addEventListener("click", onCancel);
          document.addEventListener("keydown", onKey, { capture: true });
          // focus ok button so Enter triggers it
          okBtn.focus();
        });
      }

      function handleFPVCommand(command) {
        logMessage(`> ${command}`, "#f0f0f0");
        const t = command.toLowerCase().trim();
        const parts = t.split(" ");
        const action = parts[0];
        const direction = parts[1];
        if (action === "move" || action === "go") {
          if (direction === "forward")
            GameTurnManager.queuePlayerAction(movePlayer, 1);
          else if (direction === "backward")
            GameTurnManager.queuePlayerAction(movePlayer, -1);
          else logMessage("Move where? (forward, backward)", "#a8a8a8");
        } else if (action === "turn") {
          if (direction === "left") quickTurn(90);
          else if (direction === "right") quickTurn(-90);
          else logMessage("Turn where? (left, right)", "#a8a8a8");
        } else if (t.includes("look") || t.includes("examine")) {
          logMessage(
            "You are in a dark stone dojo. The air is heavy.",
            "#a8a8a8"
          );
        } else if (t.includes("attack") || t.includes("fight")) {
          // If 'attack' used as command, attempt forward melee attack
          GameTurnManager.queuePlayerAction(() => {
            const dx = -Math.round(Math.sin(player.rotationY));
            const dy = -Math.round(Math.cos(player.rotationY));
            const tx = player.x + dx,
              ty = player.y + dy;
            const target = monsters.find((m) => m.x === tx && m.y === ty);
            if (target) attack(player, target);
            else logMessage("No target in front to attack.", "#a8a8a8");
            return Promise.resolve();
          });
        } else if (
          t.includes("pickup") ||
          t.includes("take") ||
          t.includes("loot")
        ) {
          // pickup items at current tile
          GameTurnManager.queuePlayerAction(() => {
            pickupLootIfAny(player.x, player.y);
            return Promise.resolve();
          });
        } else if (t.includes("inventory") || t === "i") {
          toggleInventory();
        } else if (action === "eat") {
          const arg = direction;
          if (!arg) {
            logMessage("Eat what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            eatFood(idx);
          }
        } else if (action === "wield") {
          const arg = direction;
          if (!arg) {
            logMessage("Wield what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            wieldItem(idx);
          }
        } else if (action === "drop") {
          const arg = direction;
          if (!arg) {
            logMessage("Drop what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            dropItem(idx);
          }
        } else if (action === "quaff") {
          const arg = direction;
          if (!arg) {
            logMessage("Quaff what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            quaffItem(idx);
          }
        } else if (t.includes("stats") || t === "status") {
          logMessage(
            `HP: ${player.health}/${player.maxHealth} | Level: ${
              player.level
            } (${player.exp}/${player.expToLevel()}) | STR:${player.str} DEX:${
              player.dex
            } CON:${player.con} INT:${player.intel} WIS:${player.wis} CHA:${
              player.cha
            }`,
            "#a8a8a8"
          );
        } else if (t.includes("descend") || t.includes("stairs") || t === ">") {
          // Open the descend modal instead of instantly descending
          showDescendModal().catch(() => {});
        } else if (t.includes("help")) {
          logMessage(
            "Commands: move [forward/backward], turn [left/right], look, attack, pickup, inventory, stats, descend",
            "#a8a8a8"
          );
        } else {
          logMessage(
            `I don't understand "${command}". Type "help" for commands.`,
            "#a8a8a8"
          );
        }
      }

      // Flag to track if audio has been initialized
      let isAudioInitialized = false;

      // Audio initialization function that requires user interaction
      function initializeAudio() {
        if (isAudioInitialized) return;
        isAudioInitialized = true; // mark early to prevent reentry

        // Try to load Tone.js dynamically and initialize audio on user gesture
        loadToneIfNeeded().then(() => {
          if (!window.Tone) { console.warn('Tone not available after load'); return; }
          Tone.start().then(() => {
            try {
              // Initialize basic sound objects; failures are non-fatal
              sounds.step = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 }, volume: -12 }).toDestination();
              sounds.playerAttack = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
              sounds.monsterAttack = new Tone.MembraneSynth({ pitchDecay: 0.1, octaves: 5, envelope: { attack: 0.001, decay: 0.4, sustain: 0 } }).toDestination();
              sounds.descend = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 } }).toDestination();
              // Disabled missing audio file to prevent 404 errors; leave alert null as fallback
              sounds.alert = null;
            } catch (e) { console.warn('Failed to initialize Tone instruments', e); }
          }).catch((e) => { console.warn('Tone.start() failed or was blocked by browser gesture policy', e); });
        }).catch((e) => { console.warn('Tone.js failed to load - continuing without audio', e); });
      }

      // Event listeners for user interaction to initialize audio
      document.addEventListener('click', initializeAudio, { once: true });
      document.addEventListener('keydown', initializeAudio, { once: true });
      
      window.onload = function () {
        const loadingOverlay = document.getElementById("loading-overlay");
        const loadingFill = document.getElementById("loading-fill");
        const canvas = document.createElement("canvas");
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // draw a bold red percent symbol % on transparent background
        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = "#ff3b3b";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        // two circles for % and a diagonal slash
        ctx.beginPath();
        ctx.arc(38, 38, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(90, 90, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(28, 100);
        ctx.lineTo(100, 28);
        ctx.stroke();
        const pctTexture = new THREE.CanvasTexture(canvas);
        lootCorpseMaterial = new THREE.MeshBasicMaterial({
          map: pctTexture,
          transparent: true,
          depthTest: false,
        });
  const loader = new THREE.GLTFLoader();
  loader.setCrossOrigin && loader.setCrossOrigin('anonymous');
        // Note: speaker button handlers are initialized inside initializeUI()
        let modelsLoaded = 0;
        function loadModel(modelInfo) {
          return new Promise((resolve, reject) => {
            loader.load(
              modelInfo.url,
              (gltf) => {
                modelsLoaded++;
                loadingFill.style.width = `${
                  (modelsLoaded / models.length) * 100
                }%`;
                resolve({ ...modelInfo, gltf });
              },
              undefined,
              reject
            );
          });
        }
        Promise.allSettled(models.map(loadModel))
          .then((results) => {
            try {
              const impOk = results.find(
                (r) => r.status === 'fulfilled' && r.value.name === 'imp'
              );
              const gobOk = results.find(
                (r) => r.status === 'fulfilled' && r.value.name === 'goblin'
              );
              if (impOk) {
                const impScene = impOk.value.gltf.scene;
                impScene.name = 'Imp';
                impScene.userData.originalUrl = impOk.value.url; // Store URL for model detection
                monsterModels.push(impScene);
              }
              if (gobOk) {
                const goblinScene = gobOk.value.gltf.scene;
                goblinScene.name = 'Goblin';
                goblinScene.userData.originalUrl = gobOk.value.url; // Store URL for model detection
                monsterModels.push(goblinScene);
              }
              if (monsterModels.length === 0) {
                console.warn('No monster models loaded — using fallback stubs');
                monsterModels.push(createStubMonsterModel('Stub A'));
                monsterModels.push(createStubMonsterModel('Stub B'));
              }
            } catch (e) {
              console.warn('Model processing failed — using fallback stubs', e);
              monsterModels = [createStubMonsterModel('Stub A'), createStubMonsterModel('Stub B')];
            }
          })
          .finally(() => {
            // Always start the game, even if models failed. Attach player later.
            setTimeout(() => {
              loadingOverlay.classList.add('hidden');
              init();
              initializeUI();
              syncPromptHeightVar();
              
              // === CREATE MONSTER FOR TUNING (after everything is loaded) ===
              setTimeout(() => {
                console.log('Creating monster after full initialization');
                createMonsterForTuning();
                
                // Run forensic scan immediately after monster creation
                setTimeout(() => {
                  if (window.forensicSync) {
                    console.log('🔍 Running forensic scan after monster creation');
                    window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
                  }
                }, 200);
              }, 100);
              
              // Welcome message to test adventure container
              setTimeout(() => {
                logMessage("🎮 Adventure Container loaded! The beautiful 3D neumorphic UI from Origami.Dungeon.001.E is now active.", "#00e5ff");
                logMessage("✨ Try commands like 'look', 'go north', or 'inventory' in the command input below.", "#ffffff");
              }, 500);
            }, 200);
          });

        function initializeUI() {
          // DOM references
          const enterBtn = document.getElementById("dnd-fpv-enter-btn");
          const speakerBtn = document.getElementById("dnd-fpv-speaker-btn");
          const soundBtn = document.getElementById("sound-btn");
          const volumeSliderContainer = document.getElementById(
            "volume-slider-container"
          );
          const volumeSlider = document.getElementById("volume-slider");
          // Radar setup
          radarCanvasTop = document.querySelector("#fpv-compass-top .radar-canvas");
          radarCtxTop = radarCanvasTop ? radarCanvasTop.getContext("2d") : null;
          
          radarCanvasPanel = document.querySelector("#dnd-compass-container .radar-canvas");
          radarCtxPanel = radarCanvasPanel ? radarCanvasPanel.getContext("2d") : null;
          
          [radarCanvasTop, radarCanvasPanel].forEach((c) => {
            if(c) { c.width = c.height = 128; }
          });
          commandInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              const command = commandInput.value.trim();
              if (command) {
                handleFPVCommand(command);
                commandInput.value = "";
              }
            }
          });
          
          // Add event listener for the new adventure command input
          if (adventureCommandInput) {
            adventureCommandInput.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                const command = adventureCommandInput.value.trim();
                if (command) {
                  handleFPVCommand(command);
                  adventureCommandInput.value = "";
                }
              }
            });
          }
          
          // Add event handlers for quick action buttons
          const qaAuto = document.getElementById("qa-auto");
          if (qaAuto) {
            qaAuto.addEventListener("click", () => {
              // Toggle auto mode
              const isPressed = qaAuto.getAttribute("aria-pressed") === "true";
              qaAuto.setAttribute("aria-pressed", !isPressed);
              qaAuto.textContent = !isPressed ? "Auto: ON" : "Auto Turn";
            });
          }
          
          const qaLook = document.getElementById("qa-look");
          if (qaLook) {
            qaLook.addEventListener("click", () => handleFPVCommand("look"));
          }
          
          const qaHelp = document.getElementById("qa-help");
          if (qaHelp) {
            qaHelp.addEventListener("click", () => handleFPVCommand("help"));
          }
          
          const qaMode = document.getElementById("qa-mode");
          if (qaMode) {
            qaMode.addEventListener("click", () => {
              // Toggle between Real-time and Turn-based
              const isRealtime = qaMode.textContent.includes("Real-time");
              qaMode.textContent = isRealtime ? "Mode: Turn-based" : "Mode: Real-time";
              qaMode.setAttribute("aria-pressed", !isRealtime);
            });
          }
          
          // Adventure container button handlers
          const dndThemeBtn = document.getElementById("dnd-adventure-theme-toggle-btn");
          if (dndThemeBtn) {
            dndThemeBtn.addEventListener("click", () => {
              logMessage("Theme toggle activated.");
              // Could toggle between light/dark themes or different visual styles
            });
          }
          
          const dndInventoryBtn = document.getElementById("dnd-adventure-inventory-btn");
          if (dndInventoryBtn) {
            dndInventoryBtn.addEventListener("click", () => {
              handleFPVCommand("inventory");
            });
          }
          
          const dndRedrawBtn = document.getElementById("dnd-adventure-redraw-map-btn");
          if (dndRedrawBtn) {
            dndRedrawBtn.addEventListener("click", () => {
              logMessage("Map redrawn.");
              // Could refresh the 3D scene or update the radar display
              drawRadar(); // Update radar displays
            });
          }
          
          // Death modal restart button handler
          const restartBtn = document.getElementById("restart-game-btn");
          if (restartBtn) {
            restartBtn.addEventListener("click", () => {
              restartGame();
            });
          }
          
          enterBtn.addEventListener("click", () => {
            const command = commandInput.value.trim();
            if (command) {
              handleFPVCommand(command);
              commandInput.value = "";
            }
          });
          // Audio controls
          if (soundBtn) {
            soundBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (volumeSliderContainer.style.display === "block") {
                Tone.Destination.mute = !Tone.Destination.mute;
                soundBtn.textContent = Tone.Destination.mute ? "🔇" : "🎵";
              } else {
                volumeSliderContainer.style.display = "block";
              }
            });
          }
          if (volumeSlider) {
            volumeSlider.addEventListener("input", () => {
              const value = Number(volumeSlider.value);
              const dB = value - 100;
              Tone.Destination.volume.value = dB;
              if (Tone.Destination.mute) {
                Tone.Destination.mute = false;
                if (soundBtn) soundBtn.textContent = "🎵";
              }
            });
          }
          if (speakerBtn) {
            speakerBtn.addEventListener("click", () => {
              isAudioEnabled = !isAudioEnabled;
              speakerBtn.textContent = isAudioEnabled ? "🔊" : "🔈";
              logMessage(
                isAudioEnabled ? "Audio enabled." : "Audio muted.",
                "#87ceeb"
              );
              Tone.Destination.mute = !isAudioEnabled;
            });
          }
          document.addEventListener("click", (e) => {
            if (
              volumeSliderContainer &&
              !volumeSliderContainer.contains(e.target) &&
              !soundBtn.contains(e.target)
            ) {
              volumeSliderContainer.style.display = "none";
            }
          });
          const q = (s) => document.querySelector(s);
          q(".mv-up")?.addEventListener("click", () =>
            GameTurnManager.queuePlayerAction(movePlayer, 1)
          );
          q(".mv-down")?.addEventListener("click", () =>
            GameTurnManager.queuePlayerAction(movePlayer, -1)
          );
          q(".mv-left")?.addEventListener("click", () => quickTurn(90));
          q(".mv-right")?.addEventListener("click", () => quickTurn(-90));
          q(".mv-act")?.addEventListener("click", handleInteract);
          document.querySelectorAll(".qa").forEach((btn) => {
            const txt = btn.textContent.trim().toLowerCase();
            if (txt === "help")
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                showHelpModal();
              });
            else btn.addEventListener("click", () => handleFPVCommand(txt));
          });
          q('#prompt-icon-stack .stk[title="Settings"]')?.addEventListener(
            "click",
            () => logMessage("Settings panel not implemented.", "#a8a8a8")
          );
          q('#prompt-icon-stack .stk[title="Docs"]')?.addEventListener(
            "click",
            (e) => {
              e.stopPropagation();
              showHelpModal();
            }
          );
          // Bind '?' key to open help modal
          window.addEventListener("keydown", (e) => {
            if (e.key === "?") {
              e.preventDefault();
              showHelpModal();
            }
          });
          // end audio controls
          document.addEventListener("click", (e) => {
            if (
              volumeSliderContainer &&
              !volumeSliderContainer.contains(e.target) &&
              !soundBtn.contains(e.target)
            ) {
              volumeSliderContainer.style.display = "none";
            }
          });
          // Prompt height may change after UI initializes; resync once more
          setTimeout(syncPromptHeightVar, 50);
          // start keypad dice idle animation
          requestAnimationFrame(animateDiceIdle);
        }

        // Audio initialization moved to the top level with user interaction
        // Check if audio was already initialized from click/keydown
        if (!isAudioInitialized) {
          console.log("Waiting for user interaction to initialize audio");
        }
        // Map header click to toggle maximize state
        const mainContainer = document.getElementById("main-container");
        const fpvLabel = fpvViewContainer.querySelector(".view-label");
        const mapLabel = mapContainer.querySelector(".view-label");

        mapLabel.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          // Don't allow swapping on mobile
          if (window.innerWidth <= 768) return;
          mainContainer.classList.toggle("views-swapped");
          // Move the FPV prompt band to always sit under the large active FPV container
          const prompt = document.getElementById("dnd-fpv-prompt");
          if (prompt) {
            if (mainContainer.classList.contains("views-swapped")) {
              // FPV becomes small, keep prompt inside fpview-container but visible (CSS no longer hides it)
              fpvViewContainer.appendChild(prompt);
            } else {
              // FPV is large, ensure prompt is in fpview-container
              fpvViewContainer.appendChild(prompt);
            }
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 60);
          setTimeout(() => {
            syncPromptHeightVar();
            window.dispatchEvent(new Event("resize"));
          }, 60);
        });
        fpvLabel?.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          // Don't allow swapping on mobile
          if (window.innerWidth <= 768) return;
          mainContainer.classList.toggle("views-swapped");
          const prompt = document.getElementById("dnd-fpv-prompt");
          if (prompt) {
            if (mainContainer.classList.contains("views-swapped")) {
              fpvViewContainer.appendChild(prompt);
            } else {
              fpvViewContainer.appendChild(prompt);
            }
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 60);
          setTimeout(() => {
            syncPromptHeightVar();
            window.dispatchEvent(new Event("resize"));
            
            // Position keypad after load
            try {
              positionKeypad();
              console.log('✅ Keypad positioned successfully');
            } catch (e) {
              console.error('❌ positionKeypad() failed:', e);
            }
          }, 60);
        });
      };

      // === FLUID UI SYSTEM ===
      
      class FluidUI {
        constructor() {
          this.mapContainer = document.getElementById('mapview-container');
          this.fpvContainer = document.getElementById('fpv-viewport');
          this.mainContainer = document.getElementById('main-container');
          this.isDragging = false;
          this.isResizing = false;
          this.currentHandle = null;
          this.startPos = { x: 0, y: 0 };
          this.startSize = { width: 0, height: 0 };
          this.startPosition = { left: 0, top: 0 };
          
          this.init();
        }
        
        init() {
          this.addDragFunctionality();
          this.addResizeFunctionality();
          this.addLabelClickHandlers();
          this.addAutoLayoutDetection();
          this.addAdventureViewMinimization();
        }
        
        addDragFunctionality() {
          this.mapContainer.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('view-label')) return;
            
            this.isDragging = true;
            this.mapContainer.classList.add('dragging');
            this.startPos = { x: e.clientX, y: e.clientY };
            this.startPosition = {
              left: this.mapContainer.offsetLeft,
              top: this.mapContainer.offsetTop
            };
            
            e.preventDefault();
          });
          
          document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - this.startPos.x;
            const deltaY = e.clientY - this.startPos.y;
            
            let newLeft = this.startPosition.left + deltaX;
            let newTop = this.startPosition.top + deltaY;
            
            // Constrain to viewport
            const containerRect = this.mapContainer.getBoundingClientRect();
            newLeft = Math.max(0, Math.min(window.innerWidth - containerRect.width, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - containerRect.height, newTop));
            
            this.mapContainer.style.left = newLeft + 'px';
            this.mapContainer.style.top = newTop + 'px';
            this.mapContainer.style.right = 'auto';
            this.mapContainer.style.bottom = 'auto';
            
            this.checkAutoLayout();
          });
          
          document.addEventListener('mouseup', () => {
            if (this.isDragging) {
              this.isDragging = false;
              this.mapContainer.classList.remove('dragging');
            }
          });
        }
        
        addResizeFunctionality() {
          const handles = this.mapContainer.querySelectorAll('.resize-handle');
          
          handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
              this.isResizing = true;
              this.currentHandle = handle;
              this.mapContainer.classList.add('resizing');
              this.startPos = { x: e.clientX, y: e.clientY };
              this.startSize = {
                width: this.mapContainer.offsetWidth,
                height: this.mapContainer.offsetHeight
              };
              this.startPosition = {
                left: this.mapContainer.offsetLeft,
                top: this.mapContainer.offsetTop
              };
              
              e.stopPropagation();
              e.preventDefault();
            });
          });
          
          document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            
            const deltaX = e.clientX - this.startPos.x;
            const deltaY = e.clientY - this.startPos.y;
            const handleClass = this.currentHandle.className;
            
            let newWidth = this.startSize.width;
            let newHeight = this.startSize.height;
            let newLeft = this.startPosition.left;
            let newTop = this.startPosition.top;
            
            if (handleClass.includes('se')) {
              newWidth = Math.max(200, this.startSize.width + deltaX);
              newHeight = Math.max(200, this.startSize.height + deltaY);
            } else if (handleClass.includes('sw')) {
              newWidth = Math.max(200, this.startSize.width - deltaX);
              newHeight = Math.max(200, this.startSize.height + deltaY);
              newLeft = this.startPosition.left + deltaX;
            } else if (handleClass.includes('ne')) {
              newWidth = Math.max(200, this.startSize.width + deltaX);
              newHeight = Math.max(200, this.startSize.height - deltaY);
              newTop = this.startPosition.top + deltaY;
            } else if (handleClass.includes('nw')) {
              newWidth = Math.max(200, this.startSize.width - deltaX);
              newHeight = Math.max(200, this.startSize.height - deltaY);
              newLeft = this.startPosition.left + deltaX;
              newTop = this.startPosition.top + deltaY;
            }
            
            this.mapContainer.style.width = newWidth + 'px';
            this.mapContainer.style.height = newHeight + 'px';
            this.mapContainer.style.left = newLeft + 'px';
            this.mapContainer.style.top = newTop + 'px';
            this.mapContainer.style.right = 'auto';
            this.mapContainer.style.bottom = 'auto';
            
            this.checkAutoLayout();
          });
          
          document.addEventListener('mouseup', () => {
            if (this.isResizing) {
              this.isResizing = false;
              this.currentHandle = null;
              this.mapContainer.classList.remove('resizing');
            }
          });
        }
        
        addLabelClickHandlers() {
          const mapLabel = this.mapContainer.querySelector('.view-label');
          const fpvLabel = this.fpvContainer.querySelector('.view-label');
          
          mapLabel?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.switchPositions();
          });
          
          fpvLabel?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.switchPositions();
          });
        }
        
        switchPositions() {
          // Get current positions
          const mapRect = this.mapContainer.getBoundingClientRect();
          const fpvRect = this.fpvContainer.getBoundingClientRect();
          
          // Store map container's current absolute position
          const mapCurrentLeft = this.mapContainer.offsetLeft;
          const mapCurrentTop = this.mapContainer.offsetTop;
          
          // If map is in its default position (top-right), move it to bottom-left
          if (mapCurrentLeft > window.innerWidth * 0.6 && mapCurrentTop < window.innerHeight * 0.4) {
            this.mapContainer.style.left = '20px';
            this.mapContainer.style.top = (window.innerHeight - mapRect.height - 20) + 'px';
            this.mapContainer.style.right = 'auto';
            this.mapContainer.style.bottom = 'auto';
          } else {
            // Move back to top-right
            this.mapContainer.style.left = 'auto';
            this.mapContainer.style.top = '20px';
            this.mapContainer.style.right = '20px';
            this.mapContainer.style.bottom = 'auto';
          }
        }
        
        checkAutoLayout() {
          const mapRect = this.mapContainer.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Check if approaching 50/50 split (within 5%)
          const horizontalMidpoint = viewportWidth * 0.5;
          const verticalMidpoint = viewportHeight * 0.5;
          const tolerance = Math.min(viewportWidth, viewportHeight) * 0.05; // 5% tolerance
          
          // Check if map spans close to 50% of screen
          const mapSpansHorizontal = Math.abs(mapRect.width - viewportWidth * 0.5) < tolerance;
          const mapSpansVertical = Math.abs(mapRect.height - viewportHeight * 0.5) < tolerance;
          
          // Check if positioned near center line
          const nearHorizontalCenter = Math.abs((mapRect.left + mapRect.width/2) - horizontalMidpoint) < tolerance;
          const nearVerticalCenter = Math.abs((mapRect.top + mapRect.height/2) - verticalMidpoint) < tolerance;
          
          if ((mapSpansHorizontal && nearVerticalCenter) || (mapSpansVertical && nearHorizontalCenter)) {
            this.enableAutoLayout(mapSpansHorizontal ? 'side-by-side' : 'top-bottom');
          } else {
            this.disableAutoLayout();
          }
        }
        
        enableAutoLayout(type) {
          if (type === 'side-by-side') {
            this.mainContainer.classList.add('auto-layout-horizontal');
            this.mainContainer.classList.remove('auto-layout-vertical');
          } else {
            this.mainContainer.classList.add('auto-layout-vertical');
            this.mainContainer.classList.remove('auto-layout-horizontal');
          }
        }
        
        disableAutoLayout() {
          this.mainContainer.classList.remove('auto-layout-horizontal', 'auto-layout-vertical');
        }
        
        addAutoLayoutDetection() {
          // Monitor for auto-layout triggers during resize/drag operations
          const checkAutoLayoutThrottled = () => {
            clearTimeout(this.autoLayoutCheckTimer);
            this.autoLayoutCheckTimer = setTimeout(() => {
              this.checkAutoLayout();
            }, 100);
          };
          
          // Add to existing event listeners
          window.addEventListener('resize', checkAutoLayoutThrottled);
          
          // Check auto-layout periodically during drag operations
          this.mapContainer.addEventListener('mousedown', () => {
            this.autoLayoutInterval = setInterval(checkAutoLayoutThrottled, 50);
          });
          
          document.addEventListener('mouseup', () => {
            if (this.autoLayoutInterval) {
              clearInterval(this.autoLayoutInterval);
              this.autoLayoutInterval = null;
            }
          });
        }

        addAdventureViewMinimization() {
          const adventureView = document.getElementById('adventure-view');
          if (!adventureView) return;

          let clickCount = 0;
          let clickTimer = null;

          adventureView.addEventListener('click', (e) => {
            // Only trigger on clicks to the adventure view itself, not child elements
            if (e.target !== adventureView && !e.target.classList.contains('panel-label')) return;

            clickCount++;
            
            if (clickCount === 1) {
              clickTimer = setTimeout(() => {
                clickCount = 0;
              }, 400); // Reset after 400ms
            } else if (clickCount === 2) {
              clearTimeout(clickTimer);
              clickCount = 0;
              this.toggleAdventureViewMinimized();
            }
          });

          // Also allow clicking on the panel label to minimize
          const panelLabel = adventureView.querySelector('.panel-label');
          if (panelLabel) {
            panelLabel.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              this.toggleAdventureViewMinimized();
            });
          }
        }

        toggleAdventureViewMinimized() {
          const adventureView = document.getElementById('adventure-view');
          if (!adventureView) return;

          const isMinimized = adventureView.classList.contains('minimized');
          
          if (isMinimized) {
            // Expand
            adventureView.classList.remove('minimized');
          } else {
            // Minimize
            adventureView.classList.add('minimized');
          }

          // Update mini compass radar
          this.updateMiniCompassRadar();
        }

        updateMiniCompassRadar() {
          const miniRadar = document.getElementById('mini-compass-radar');
          const mainCompass = document.getElementById('compass-needle-ui');
          
          if (!miniRadar || !mainCompass) return;

          // Sync the mini radar with the main compass direction
          const compassRotation = getComputedStyle(mainCompass).transform;
          if (compassRotation && compassRotation !== 'none') {
            const needle = miniRadar.querySelector('.absolute.top-1');
            if (needle) {
              needle.style.transform = `${compassRotation} -translate-x-1/2`;
            }
          }
        }
      }
      
      // Add CSS for auto-layout
      const autoLayoutCSS = `
        #main-container.auto-layout-horizontal {
          display: flex;
          flex-direction: row;
          width: 100vw;
          height: 100vh;
        }
        
        #main-container.auto-layout-horizontal #mapview-container {
          position: relative !important;
          width: 50% !important;
          height: 100% !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          border-radius: 0 !important;
        }
        
        #main-container.auto-layout-horizontal #fpv-viewport {
          width: 50% !important;
          height: 100% !important;
        }
        
        #main-container.auto-layout-vertical {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
        }
        
        #main-container.auto-layout-vertical #mapview-container {
          position: relative !important;
          width: 100% !important;
          height: 50% !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          border-radius: 0 !important;
        }
        
        #main-container.auto-layout-vertical #fpv-viewport {
          width: 100% !important;
          height: 50% !important;
        }
      `;
      
      // Inject auto-layout CSS
      const autoLayoutStyleSheet = document.createElement('style');
      autoLayoutStyleSheet.textContent = autoLayoutCSS;
      document.head.appendChild(autoLayoutStyleSheet);
      
      // Initialize Fluid UI System
      new FluidUI();

      // Ensure a single awardXP implementation is used
      window.awardXP = awardXP;
      
      // Dice roll helpers (FPV movement overlay)
      try {
        function rollCenterDice() {
          try {
            const dice = document.querySelector('.dnd-game-3d-dice');
            if (!dice) return;

            const result = Math.floor(Math.random() * 6) + 1;
            const rotations = {
              1: 'rotateX(0deg) rotateY(0deg)',
              2: 'rotateX(-90deg) rotateY(0deg)',
              3: 'rotateX(0deg) rotateY(-90deg)',
              4: 'rotateX(0deg) rotateY(90deg)',
              5: 'rotateX(90deg) rotateY(0deg)',
              6: 'rotateX(180deg) rotateY(0deg)'
            };

            const randomX = (Math.floor(Math.random() * 4) + 2) * 360;
            const randomY = (Math.floor(Math.random() * 4) + 2) * 360;

            dice.classList.add('rolling');
            dice.classList.remove('fast-spin');
            dice.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg) ${rotations[result]}`;

            setTimeout(() => { try { dice.classList.remove('rolling'); dice.style.transform = rotations[result]; } catch(e) {} }, 1800);

            try {
              const diceSound = new Audio();
              diceSound.volume = 0.32;
              diceSound.src = 'data:audio/wav;base64,UklGRjsBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRMBAAC4uLi4uLi4uLi4tbW1tbW1tbW1tbWysrKysrKysrKyrq6urq6urq6urqurq6urq6urq6urqKioqKioqKioqKWlpaWlpaWlpaWipaKloqWipaKln6Ofop+in6KfoqGhoaGhoaGhoaGenp6enp6enp6em5ubm5ubm5ubm5iYmJiYmJiYmJiVlZWVlZWVlZWVkpKSkpKSkpKSkpOTk5OTk5OTk5CQkJCQkJCQkJCNjY2NjY2NjY2NioqKioqKioqKiYmJiYmJiYmJhoeGh4aHhoeGg4ODg4ODg4ODgYGBgYGBgYGBfn5+fn5+fn5+fHx8fHx8fHx8eXl5eXl5eXl5dnZ2dnZ2dnZ2dHR0dHR0dHR0cXFxcXFxcXFxbm5ubm5ubm5ubGxsbGxsbGxsaWlpaWlpaWlpZ2dnZ2dnZ2dnZGRkZGRkZGRkYmJiYmJiYmJiX19fX19fX19fXFxcXFxcXFxcWlpaWlpaWlpaV1dXV1dXV1dXVVVVVVVVVVVVUlJSUlJSUlJSUFBQUFBQUFBQTU1NTU1NTU1NSkpKSkpKSkpKSEhISEhISEhIRUVFRUVFRUVFQ0NDQ0NDQ0NDQEBAQEBAQEBAOj09';
              diceSound.play().catch(()=>{});
            } catch(e) {}

            setTimeout(() => { try { showDiceResult(result); } catch(e) {} }, 1200);
            return result;
          } catch (e) { console.warn('rollCenterDice failed', e); }
        }

        function showDiceResult(result) {
          try {
            const resultEl = document.createElement('div');
            resultEl.className = 'dice-result-popup';
            resultEl.textContent = `🎲 ${result}`;
            resultEl.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(59,130,246,0.92); color: white; padding: 12px 20px; border-radius: 14px; font-size: 20px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 2000; animation: diceResultAnim 1.8s ease-out forwards; pointer-events: none;';

            if (!document.getElementById('dice-result-styles')) {
              const style = document.createElement('style');
              style.id = 'dice-result-styles';
              style.textContent = '@keyframes diceResultAnim { 0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0 } 30% { transform: translate(-50%, -50%) scale(1.1); opacity: 1 } 60% { transform: translate(-50%, -60%) scale(1); opacity: 1 } 100% { transform: translate(-50%, -140%) scale(1); opacity: 0 } }';
              document.head.appendChild(style);
            }

            document.body.appendChild(resultEl);
            setTimeout(()=>resultEl.remove(), 1800);
          } catch(e) { console.warn('showDiceResult failed', e); }
        }
      } catch(e) { console.warn('dice helpers failed to initialize', e); }

      // Small directional helper used by the FPV keypad overlay buttons
      try {
        window.movePlayerDir = function(dir) {
          try {
            console.log('FPV Keypad movement:', dir);
            
            // Map keypad directions to arrow key events
            const keyMap = {
              'up': 'ArrowUp',
              'down': 'ArrowDown', 
              'left': 'ArrowLeft',
              'right': 'ArrowRight'
            };
            
            const arrowKey = keyMap[dir];
            if (arrowKey) {
              // Create and dispatch a keydown event to simulate arrow key press
              const keyEvent = new KeyboardEvent('keydown', {
                key: arrowKey,
                code: arrowKey,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(keyEvent);
              
              // Brief delay then keyup to complete the movement
              setTimeout(() => {
                const keyUpEvent = new KeyboardEvent('keyup', {
                  key: arrowKey,
                  code: arrowKey,
                  bubbles: true,
                  cancelable: true
                });
                document.dispatchEvent(keyUpEvent);
              }, 100);
            }
          } catch(e) { console.warn('movePlayerDir failed', e); }
        };
      } catch(e) { console.warn('failed to install movePlayerDir', e); }
      
      // Global console functions for forensic analysis
      console.log('🚀 FORENSIC TOOLS LOADED:');
      console.log('   analyzeMonsters() - Analyze monster model duplication');
      console.log('   analyzeClickMove() - Analyze click-to-move system');
      console.log('   analyzeTacticalPositioning() - Analyze tactical circle & model positioning');
      console.log('   runFullForensics() - Run complete forensic analysis');
      console.log('   fixArrows() - Emergency arrow visibility fix');
      window.addWhiteBorders = () => { if (window.forensicSync) window.forensicSync.addWhiteBorders(); };

      // START THE GAME ENGINE
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
      } else {
        init();
      }
    

/* ---------- NEXT SCRIPT BLOCK ---------- */

(function(){
  try{
    if(window.__forensic_patch_applied) return; window.__forensic_patch_applied=true;
    console.log('[forensic-patch] Applying layer defaults to runtime objects');
    const MAP_LAYER = 0; const FPV_LAYER = 1;
    function enableLayersOn(obj){ if(!obj || !obj.layers) return; try{ obj.layers.set(MAP_LAYER); obj.layers.enable(FPV_LAYER);}catch(e){} }
    function traverseAndFix(root){ if(!root||!root.traverse) return; root.traverse(function(o){ if(o && o.userData && (o.userData.isGameObject || o.userData.isMonster || o.userData.isPlayer || o.userData.isPickup || o.userData.isInteractable)){ enableLayersOn(o); } }); }
    // If scene is ready, fix immediately, otherwise wait for window.scene to appear
    function tryFix(){ try{ if(window.scene){ traverseAndFix(window.scene); console.log('[forensic-patch] Layer defaults applied to scene'); } else { setTimeout(tryFix, 250); } } catch(e){ console.warn('[forensic-patch] failed', e); } }
    // Ensure cameras see both layers too
    function fixCameras(){ try{ if(window.fpvCamera){ window.fpvCamera.layers.enable(MAP_LAYER); window.fpvCamera.layers.enable(FPV_LAYER);} if(window.camera){ window.camera.layers.enable(MAP_LAYER);} if(window.mapCamera){ window.mapCamera.layers.enable(MAP_LAYER);} }catch(e){}}
    tryFix(); fixCameras();
  }catch(e){ console.warn('[forensic-patch] top-level error', e); }
})();

/* ---------- NEXT SCRIPT BLOCK ---------- */


	// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
		(function () {
			function refreshCSS() {
				var sheets = [].slice.call(document.getElementsByTagName("link"));
				var head = document.getElementsByTagName("head")[0];
				for (var i = 0; i < sheets.length; ++i) {
					var elem = sheets[i];
					var parent = elem.parentElement || head;
					parent.removeChild(elem);
					var rel = elem.rel;
					if (elem.href && typeof rel != "string" || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
						var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '');
						elem.href = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cacheOverride=' + (new Date().valueOf());
					}
					parent.appendChild(elem);
				}
			}
			var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
			var address = protocol + window.location.host + window.location.pathname + '/ws';
			var socket = new WebSocket(address);
			socket.onmessage = function (msg) {
				if (msg.data == 'reload') window.location.reload();
				else if (msg.data == 'refreshcss') refreshCSS();
			};
			if (sessionStorage && !sessionStorage.getItem('IsThisFirstTime_Log_From_LiveServer')) {
				console.log('Live reload enabled.');
				sessionStorage.setItem('IsThisFirstTime_Log_From_LiveServer', true);
			}
		})();
	}
	else {
		console.error('Upgrade your browser. This Browser is NOT supported WebSocket for Live-Reloading.');
	}
	// ]]>


/* ---------- NEXT SCRIPT BLOCK ---------- */


        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        const defaultCategories = [
            { id: 'EARTH', kanji: '地', icon: 'fa-mountain', desc: 'Heavy impact.', attr: '(STUN * 2DICE)', cards: ['QUAKE', 'FISSURE'] },
            { id: 'WIND', kanji: '風', icon: 'fa-wind', desc: 'Forceful gust.', attr: '(PUSH * 3DICE)', cards: ['GALE'] },
            { id: 'FIRE', kanji: '火', icon: 'fa-fire', desc: 'Inferno star.', attr: '(DMG * 4DICE)', cards: ['FIREBALL', 'PYROBLAST', 'COMET'] },
            { id: 'WATER', kanji: '水', icon: 'fa-water', desc: 'Viscous tide.', attr: '(SLOW * 3DICE)', cards: ['TIDE', 'SURGE'] },
            { id: 'ITEM', kanji: '薬', icon: 'fa-flask', desc: 'Green nectar.', attr: '(HEAL HP * 1DICE)', cards: ['POTION', 'SCROLL OF IDENTITY'] }
        ];

        const combatCardsArr = [
            { name: 'THRUST', id: 'THRUST', kanji: '突', icon: 'fa-wind', desc: 'Fast thrust.', attr: '(DMG * 1DICE)' },
            { name: 'SLASH', id: 'SLASH', kanji: '斬', icon: 'fa-fire', desc: 'Basic slash.', attr: '(DMG * 1DICE)' },
            { name: 'DEFEND', id: 'DEFEND', kanji: '盾', icon: 'fa-water', desc: 'Raises AC.', attr: '(DEFEND)' }
        ];

        const combatCategories = [
            { id: 'COL1', kanji: '壱', desc: 'Fast Attack', attr: '(SPEED)', cards: [combatCardsArr[0]] },
            { id: 'COL2', kanji: '弐', desc: 'Strong Attack', attr: '(POWER)', cards: [combatCardsArr[1]] },
            { id: 'COL3', kanji: '参', desc: 'Block', attr: '(GUARD)', cards: [combatCardsArr[2]] }
        ];

        const wagerCardsArr = [
            { name: 'BET EVEN', id: 'DICE_EVEN', kanji: '偶', icon: 'fa-dice', desc: 'Double your coins.', attr: '(PAYS 1:1)' },
            { name: 'BET ODD', id: 'DICE_ODD', kanji: '奇', icon: 'fa-dice', desc: 'Double your coins.', attr: '(PAYS 1:1)' }
        ];

        const wagerCategories = [
            { id: 'WAGER1', kanji: '賭', desc: 'Wager Slot', attr: '(SLOT MACH)', cards: [...wagerCardsArr] },
            { id: 'WAGER2', kanji: '賭', desc: 'Wager Slot', attr: '(SLOT MACH)', cards: [...wagerCardsArr].reverse() }
        ];

        let categories = defaultCategories;

        let focusedColIndex = 0, pendingAction = null, wheelThrottle = false;
        const scenes = {}, dpr = window.devicePixelRatio || 1;
        
        let avatarMixer = null;
        let avatarAction = null;
        let avatarScene, avatarCamera, avatarRenderer, avatarClock;

        function init3DIcons() {
            const elements = ['EARTH', 'WATER', 'FIRE', 'WIND', 'ITEM', 'KATANA', 'SHIELD', 'DICE_EVEN', 'DICE_ODD'];
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            
            elements.forEach(el => {
                const scene = new THREE.Scene();
                scene.add(new THREE.AmbientLight(0xffffff, 1.2));
                const dir = new THREE.DirectionalLight(0xffffff, 1.0);
                dir.position.set(5, 5, 5); scene.add(dir);
                
                const mat = new THREE.MeshStandardMaterial({ 
                    color: { EARTH: 0x5C4033, WATER: 0x0d47a1, FIRE: 0xb71c1c, WIND: 0x37474f, ITEM: 0x1b5e20 }[el] || 0x444444,
                    roughness: 0.15, metalness: 0.4, flatShading: true, side: THREE.DoubleSide 
                });
                
                let group = new THREE.Group(), update;
                if (el === 'EARTH') {
                    // Forensic Quake fix - sharp facets, correct size
                    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), mat); group.add(rock);
                    update = (t) => {
                        const b = Math.abs(Math.sin(t * 1.5)); rock.position.y = (b * 0.7) - 0.35; 
                        rock.rotation.x = t * 1.8; rock.rotation.z = t * 1.2;
                        if (b < 0.2) group.position.set(Math.sin(t * 5) * (0.2-b)*2, Math.cos(t * 6) * (0.1-b/2)*2, 0);
                        else group.position.set(0, 0, 0);
                    };
                } else if (el === 'FIRE') {
                    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshStandardMaterial({ color: 0xb71c1c, emissive: 0x4a0000, emissiveIntensity: 5, flatShading: true })); group.add(core);
                    const flames = [];
                    for(let i=0; i<36; i++) {
                        const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xffea00 : (i % 2 === 0 ? 0xff4500 : 0xb71c1c), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, flatShading: true }));
                        const ang = (i / 36) * Math.PI * 2, rad = 0.2 + Math.random() * 0.45;
                        s.position.set(Math.cos(ang) * rad, 0.3, Math.sin(ang) * rad); group.add(s);
                        flames.push({ m: s, s: 6 + Math.random() * 10, o: Math.random() * Math.PI, rs: (Math.random() - 0.5) * 5, bx: s.position.x, bz: s.position.z });
                    }
                    update = (t) => {
                        core.rotation.y = t * 1.2; core.scale.setScalar(1 + Math.sin(t * 12) * 0.08);
                        flames.forEach(f => {
                            const w = Math.sin(t * f.s + f.o); f.m.scale.setScalar(0.4 + w * 0.6); f.m.position.y = 0.3 + w * 0.4;
                            f.m.position.x = f.bx + Math.sin(t * 5 + f.o) * 0.1; f.m.position.z = f.bz + Math.cos(t * 5 + f.o) * 0.1; f.m.rotation.x = t * f.rs;
                        });
                    };
                } else if (el === 'WIND') {
                    const tornado = new THREE.Group();
                    for(let i=0; i<10; i++) {
                        const h = i/10, r = (h*1.4)+0.4, pts = [];
                        for(let j=0; j<=12; j++) pts.push(new THREE.Vector3(Math.cos((j/12)*Math.PI*2)*r, 0, Math.sin((j/12)*Math.PI*2)*r));
                        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x37474f, opacity: 0.8, transparent: true }));
                        line.position.y = (h-0.5)*2.5; tornado.add(line);
                    }
                    group.add(tornado);
                    update = (t) => { tornado.children.forEach((l, idx) => { l.rotation.y = t*(idx+70); l.position.x = Math.sin(t*8 + idx)*0.1; }); tornado.rotation.z = Math.sin(t*4)*0.1; };
                } else if (el === 'WATER') {
                    const geo = new THREE.SphereGeometry(2.8, 32, 24); const mesh = new THREE.Mesh(geo, mat); mesh.position.y = -1.8; group.add(mesh);
                    update = (t) => {
                        const pos = geo.attributes.position;
                        for(let i=0; i<pos.count; i++) {
                            const x = pos.getX(i), z = pos.getZ(i); const w = Math.sin(x * 1.5 + t * 4) * 0.4 + Math.cos(z * 1.5 + t * 3) * 0.3;
                            if(pos.getY(i) > 0.5) pos.setY(i, 1.4 + w);
                        }
                        pos.needsUpdate = true;
                    };
                } else if (el === 'ITEM') {
                    const vial = new THREE.Group();
                    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.8, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, flatShading: true }));
                    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.0, 12), new THREE.MeshStandardMaterial({ color: 0x1b5e20, emissive: 0x002e03, emissiveIntensity: 0.5 }));
                    liq.position.y = -0.3; vial.add(body, liq);
                    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
                    cork.position.y = 1.6; vial.add(cork); group.add(vial);
                    update = (t) => { vial.rotation.z = Math.sin(t * 2) * 0.2; liq.scale.y = 0.9 + Math.sin(t * 3) * 0.1; };
                } else if (el === 'KATANA') {
                    const hiltGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
                    const hiltMat = new THREE.MeshStandardMaterial({color: 0x222222});
                    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
                    const bladeGeo = new THREE.BoxGeometry(0.1, 3.5, 0.4);
                    const bladeMat = new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.8, roughness: 0.2});
                    const blade = new THREE.Mesh(bladeGeo, bladeMat);
                    blade.position.y = 2.0;
                    const guardGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
                    const guardMat = new THREE.MeshStandardMaterial({color: 0xaa8800});
                    const guard = new THREE.Mesh(guardGeo, guardMat);
                    guard.position.y = 0.6;
                    group.add(hilt, blade, guard);
                    group.position.y = -1.0;
                    update = (t) => { group.rotation.z = Math.sin(t * 3) * 0.2; group.rotation.y = t * 0.5; };
                } else if (el === 'SHIELD') {
                    const shieldGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
                    const shieldMat = new THREE.MeshStandardMaterial({color: 0x444444, metalness: 0.6, roughness: 0.4});
                    const shield = new THREE.Mesh(shieldGeo, shieldMat);
                    shield.rotation.x = Math.PI / 2;
                    const bossGeo = new THREE.SphereGeometry(0.4, 16, 16);
                    const bossMat = new THREE.MeshStandardMaterial({color: 0xaa8800});
                    const boss = new THREE.Mesh(bossGeo, bossMat);
                    boss.position.z = 0.1;
                    group.add(shield, boss);
                    update = (t) => { group.rotation.y = t * 1.5; group.rotation.x = Math.sin(t * 2) * 0.2; };
                } else if (el === 'DICE_EVEN' || el === 'DICE_ODD') {
                    const dieGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
                    const dieMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.2, metalness: 0.1});
                    const die = new THREE.Mesh(dieGeo, dieMat);
                    
                    const dotGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
                    const dotMat = new THREE.MeshStandardMaterial({color: el === 'DICE_EVEN' ? 0x1b5e20 : 0xb71c1c}); // Green for Even, Red for Odd
                    
                    // Add standard center dot mapping (1 face)
                    const dotCenter = new THREE.Mesh(dotGeo, dotMat);
                    dotCenter.rotation.x = Math.PI / 2;
                    dotCenter.position.z = 0.81;
                    die.add(dotCenter);

                    // Add opposing face (6 dots)
                    for (let x of [-0.4, 0.4]) {
                        for (let y of [-0.4, 0, 0.4]) {
                            const d = new THREE.Mesh(dotGeo, dotMat);
                            d.rotation.x = -Math.PI / 2;
                            d.position.set(x, y, -0.81);
                            die.add(d);
                        }
                    }

                    group.add(die);
                    update = (t) => { 
                        // Spin crazily
                        die.rotation.x = t * (el === 'DICE_EVEN' ? 2.5 : -2.5); 
                        die.rotation.y = t * 3.1; 
                        die.rotation.z = Math.sin(t*2);
                    };
                }
                scene.add(group); scenes[el] = { scene, update };
            });

            avatarClock = new THREE.Clock();
            
            // Single Global Camera for all 3D Icons
            const iconCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); 
            iconCamera.position.set(0, 0, 7.5);
            
            function renderLoop(time) {
                requestAnimationFrame(renderLoop);
                
                // Optimization: Do not render heavy 3D icons or avatars when the main dock is hidden (e.g. Combat Mode)
                if (document.getElementById('lower-ui-row').style.display === 'none') return;
                
                const t = time * 0.001;
                const delta = avatarClock.getDelta();
                
                if (avatarMixer) {
                    avatarMixer.update(delta);
                }
                
                if (avatarRenderer && avatarScene && avatarCamera) {
                    const container = document.getElementById('player-avatar-container');
                    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
                        const w = container.clientWidth;
                        const h = container.clientHeight;
                        const canvas = avatarRenderer.domElement;
                        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                            avatarRenderer.setSize(w, h, false);
                            avatarCamera.aspect = w / h;
                            avatarCamera.updateProjectionMatrix();
                        }
                    }
                    avatarRenderer.render(avatarScene, avatarCamera);
                }

                elements.forEach(el => {
                    scenes[el].update(t);
                    // Critical Optimization: ONLY render the 3D canvases that are on the top of the deck (depth 0) OR are Wager cards
                    // This cuts the active WebGL contexts & drawImage calls down drastically
                    let selector = `.guide-card[data-depth="0"] .card-icon-3d[data-element="${el}"] canvas`;
                    if (el === 'DICE_EVEN' || el === 'DICE_ODD') selector = `.wager-card .card-icon-3d[data-element="${el}"] canvas`;
                    const canvases = document.querySelectorAll(selector);
                    canvases.forEach(cvs => {
                        const cw = cvs.clientWidth, ch = cvs.clientHeight;
                        if (cw === 0 || ch === 0) return; 
                        const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
                        if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
                        renderer.setSize(cw, ch, false);
                        
                        // Use pre-instantiated camera to prevent massive garbage collection stalls
                        renderer.render(scenes[el].scene, iconCamera);
                        
                        const ctx = cvs.getContext('2d');
                        if (ctx) { ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h); }
                    });
                });
            }
            renderLoop(0);
        }

        function initAvatar() {
            const container = document.getElementById('player-avatar-container');
            if (!container) return;
            
            const w = container.clientWidth || 58;
            const h = container.clientHeight || 58;
            
            avatarRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            avatarRenderer.setPixelRatio(window.devicePixelRatio);
            avatarRenderer.setSize(w, h);
            container.appendChild(avatarRenderer.domElement);
            
            avatarScene = new THREE.Scene();
            avatarCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
            avatarCamera.position.set(0, 1.2, 4.5);
            avatarCamera.lookAt(0, 1.0, 0); // Explicitly look at the avatar's chest/head height
            
            const ambLight = new THREE.AmbientLight(0xffffff, 1.2); // Brighter ambient light
            avatarScene.add(ambLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional
            dirLight.position.set(5, 5, 5);
            avatarScene.add(dirLight);
            
            try {
                const loader = new GLTFLoader();
                // Adding multiple paths fallback logic like FPV does if possible, but trying relative first
                const modelUrls = [
                    './assets/models/Player.A.Walking.glb',
                    '../assets/models/Player.A.Walking.glb'
                ];
                
                function tryLoadModel(urlIndex) {
                    if (urlIndex >= modelUrls.length) {
                        console.warn("Avatar failed to load natively after all attempts. Running without Player Avatar.");
                        container.innerHTML = '<i class="fa-solid fa-user-astronaut" style="color:var(--color-text); font-size:24px;"></i>';
                        return;
                    }
                    
                    loader.load(modelUrls[urlIndex], (gltf) => {
                        const model = gltf.scene;
                        
                        // Position so the torso is centered in the circle (Shifted up ~50 virtual px)
                        model.position.set(0, -0.1, 0); // Moved up to add +25px bottom buffer
                        // Rotate to face slightly right layout (isometric feel)
                        model.rotation.y = Math.PI / 8;
                        // Scale 
                        model.scale.set(1.25, 1.25, 1.25);
                        
                        avatarScene.add(model);
                        
                        if (gltf.animations && gltf.animations.length > 0) {
                            avatarMixer = new THREE.AnimationMixer(model);
                            avatarAction = avatarMixer.clipAction(gltf.animations[0]);
                            // Don't play initially until player moves
                        }
                        
                        // Fix metallic/roughness issues that might make it render black
                        model.traverse((child) => {
                            if (child.isMesh && child.material) {
                                child.material.needsUpdate = true;
                            }
                        });
                        
                    }, undefined, (e) => {
                        console.warn(`Failed loading avatar from ${modelUrls[urlIndex]}`, e);
                        tryLoadModel(urlIndex + 1);
                    });
                }
                
                tryLoadModel(0);
                
            } catch (err) {
                console.warn("Avatar loader threw synchronous exception. Suppressing.", err);
            }
        }

        function cycle(idx, fwd = true) {
            const col = document.getElementById(`col-${idx}`);
            if (!col) return;
            const cards = Array.from(col.querySelectorAll('.guide-card'));
            if(cards.length <= 1) return;
            cards.forEach(c => {
                let d = parseInt(c.dataset.depth);
                c.dataset.depth = fwd ? (d === cards.length - 1 ? 0 : d + 1) : (d === 0 ? cards.length - 1 : d - 1);
            });
        }

        function setup() {
            categories.forEach((cat, idx) => {
                const col = document.createElement('div'); col.className = 'card-column'; col.id = `col-${idx}`;
                
                let startY = 0, isDragging = false;
                col.onpointerdown = (e) => { startY = e.clientY; isDragging = true; col.setPointerCapture(e.pointerId); };
                col.onpointermove = (e) => { 
                    if(!isDragging) return; 
                    const deltaY = e.clientY - startY; 
                    if(Math.abs(deltaY) > 25) { cycle(idx, deltaY > 0); startY = e.clientY; document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show')); } 
                };
                col.onpointerup = (e) => { isDragging = false; col.releasePointerCapture(e.pointerId); };

                cat.cards.forEach((cardData, i) => {
                    // Check if cardData is an object or string for backwards compatibility
                    const isObj = typeof cardData === 'object';
                    const cName = isObj ? cardData.name : cardData;
                    const cId = isObj ? cardData.id : cat.id;
                    const cKanji = isObj ? cardData.kanji : cat.kanji || '';
                    const cDesc = isObj ? cardData.desc : cat.desc;
                    const cAttr = isObj ? cardData.attr : cat.attr || '';
                    
                    const card = document.createElement('div');
                    card.className = `guide-card card-${(cId === 'KATANA' || cId === 'SHIELD') ? 'item' : cId.toLowerCase()}`;
                    card.dataset.depth = i;
                    card.innerHTML = `
                        <div class="card-header"><span class="card-kanji">${cKanji}</span><span class="card-type-pill">${cId}</span></div>
                        <div class="card-title">${cName}</div><div class="card-desc">${cDesc}</div>
                        <div class="card-icon-3d" data-element="${cId}"><canvas></canvas></div>
                        <div class="card-attr-fused">${cAttr}</div>
                        <div class="card-tooltip">
                            <div class="tt-title">${cName}</div>
                            <div class="tt-desc">${cDesc}</div>
                            <div class="tt-help">DBL-CLICK/ENTER TO USE</div>
                        </div>
                    `;
                    card.onclick = (e) => {
                        e.stopPropagation();
                        setFocus(idx);
                        document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                        if(card.dataset.depth === "0") {
                            const tt = card.querySelector('.card-tooltip');
                            if(tt) tt.classList.add('show');
                        }
                    };
                    card.ondblclick = (e) => {
                        e.stopPropagation();
                        if(card.dataset.depth === "0") {
                            document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                            emitAction(name, card);
                        }
                    };
                    col.appendChild(card);
                });
                document.getElementById('guides-container').appendChild(col);
            });
            document.querySelectorAll('.u-panel').forEach(p => { 
                p.onmouseenter = () => p.focus(); 
                p.onmouseleave = () => p.blur(); 
            });
            document.getElementById('bottom-panel').onwheel = e => {
                if (document.activeElement.id !== 'bottom-panel' || wheelThrottle) return;
                e.preventDefault(); wheelThrottle = true; cycle(focusedColIndex, e.deltaY > 0); setTimeout(() => wheelThrottle = false, 150);
            };
            init3DIcons(); 
            initAvatar();
            setFocus(0, false);
        }

        function launchModal(card) {
            pendingAction = card.querySelector('.card-title').textContent;
            const content = document.getElementById('modal-content');
            content.innerHTML = card.innerHTML;
            content.className = `modal-card-hd ${card.className}`;
            const styles = getComputedStyle(card);
            document.getElementById('launch-modal').style.setProperty('--modal-theme-clr', styles.getPropertyValue('--theme-clr'));
            document.getElementById('launch-modal').classList.add('active');
            document.getElementById('modal-overlay').classList.add('active');
            window.parent.postMessage({ type: 'MODAL_STATE', isOpen: true }, '*');
        }

        function setFocus(idx, scroll = true) {
            focusedColIndex = idx;
            document.querySelectorAll('.card-column').forEach((c, i) => c.classList.toggle('focused', i === idx));
            if (scroll) {
                const col = document.getElementById(`col-${idx}`), container = document.getElementById('guides-container');
                container.scrollTo({ left: col.offsetLeft - (container.offsetWidth/2) + (col.offsetWidth/2), behavior: 'smooth' });
            }
        }

        window.closeModal = () => { 
            document.getElementById('launch-modal').classList.remove('active'); 
            document.getElementById('modal-overlay').classList.remove('active'); 
            window.parent.postMessage({ type: 'MODAL_STATE', isOpen: false }, '*');
        };
        
        // Exit Modal Logic
        let exitModalActive = false;
        window.showExitModal = () => {
            if (exitModalActive) return;
            exitModalActive = true;
            document.getElementById('exit-modal').classList.add('active');
            document.getElementById('modal-overlay').classList.add('active');
            window.parent.postMessage({ type: 'MODAL_STATE', isOpen: true }, '*');
        };
        window.hideExitModal = () => {
            exitModalActive = false;
            document.getElementById('exit-modal').classList.remove('active');
            document.getElementById('modal-overlay').classList.remove('active');
            window.parent.postMessage({ type: 'MODAL_STATE', isOpen: false }, '*');
        };
        window.confirmExit = () => {
            // For now, redirect or alert
            console.log("EXITING DUNGEON");
            alert("Exiting Dungeon... (Redirect to world map)");
            window.location.reload(); // Temporary fallback
        };
        window.toggleDarkMode = () => document.body.classList.toggle('dark-mode');
        window.emitAction = (a, explicitBtn = null) => { 
            window.parent.postMessage({ type: 'FPV_ACTION', action: a }, '*');
            let btn = explicitBtn;
            if (!btn && window.event && window.event.currentTarget) {
                btn = window.event.currentTarget;
            }
            if (btn && btn.classList) {
                btn.classList.add('punch-anim');
                setTimeout(() => btn.classList.remove('punch-anim'), 300);
            }

            // Centralized panel toggler (Deprecated as user requested Attack to always show)
            const togglePlayerPanel = (mode) => {
                // Feature removed; left panel remains static
            };
            
            // Deck Swapping and Context Management
            if (a === 'WAGER') {
                loadDeck(wagerCategories, true); // True initiates Slot Machine intro
                togglePlayerPanel('DEFAULT');
            } else if (a === 'OPEN_COMBAT_DECK') {
                loadDeck(combatCategories, true);
                togglePlayerPanel('ATTACK'); // Convert left sidebar to attack mode (Back/Retreat)
            } else if (a === 'END_ATTACK') {
                loadDeck(defaultCategories, false);
                togglePlayerPanel('DEFAULT');
            } else if (a === 'RETREAT' || a === 'HIDE' || a === 'PARLEY') {
                loadDeck(defaultCategories, false);
                togglePlayerPanel('DEFAULT');
            } else if (a === 'SKILLS') {
                let container = document.getElementById('radial-skills');
                if (container) {
                    container.remove(); // toggle off
                    return;
                }
                container = document.createElement('div');
                container.id = 'radial-skills';
                container.style.position = 'absolute';
                container.style.width = '0'; container.style.height = '0';
                
                const rect = explicitBtn ? explicitBtn.getBoundingClientRect() : document.querySelector('.act-nw').getBoundingClientRect();
                container.style.left = (rect.left + rect.width / 2) + 'px';
                container.style.top = (rect.top + rect.height / 2) + 'px';
                container.style.zIndex = '500';
                document.body.appendChild(container);

                const skills = [
                    { id: 'sk-heal', icon: 'fa-hand-sparkles', color: '#00ffcc' },
                    { id: 'sk-dash', icon: 'fa-wind', color: '#ffffff' },
                    { id: 'sk-fire', icon: 'fa-fire-flame-curved', color: '#ff4400' },
                    { id: 'sk-shield', icon: 'fa-shield-halved', color: '#0088ff' },
                    { id: 'sk-focus', icon: 'fa-bullseye', color: '#ffcc00' }
                ];

                const radius = 80; // Outward expansion
                skills.forEach((sk, i) => {
                    const angleDeg = -50 - (80 * (i/(skills.length-1))); // Arc between -50 and -130 deg (compressing the top spray to avoid clipping the D-pad side)

                    const btn = document.createElement('div');
                    btn.className = 'radial-btn sp-btn'; // Steal CSS
                    btn.innerHTML = `<i class="fa-solid ${sk.icon}"></i>`;
                    btn.style.position = 'absolute';
                    btn.style.width = '42px'; btn.style.height = '42px';
                    btn.style.borderRadius = '50%';
                    btn.style.background = 'rgba(20,20,30,0.95)';
                    btn.style.border = `2px solid ${sk.color}`;
                    btn.style.color = sk.color;
                    btn.style.display = 'flex';
                    btn.style.justifyContent = 'center';
                    btn.style.alignItems = 'center';
                    btn.style.boxShadow = `0 0 10px ${sk.color}, inset 0 0 10px rgba(0,0,0,0.8)`;
                    btn.style.cursor = 'pointer';
                    btn.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    btn.style.transform = `translate(-50%, -50%) scale(0)`; 
                    btn.style.opacity = '0';
                    
                    const tx = Math.cos(angleDeg * Math.PI/180) * radius;
                    const ty = Math.sin(angleDeg * Math.PI/180) * radius;
                    
                    container.appendChild(btn);
                    
                    // Animate sequentially
                    setTimeout(() => {
                        btn.style.opacity = '1';
                        btn.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`;
                    }, 60 * i);
                    
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // Add skill triggers later
                        btn.classList.add('punch-anim');
                        setTimeout(() => container.remove(), 300);
                    };
                });
                
                // Auto close
                setTimeout(() => {
                    const closeOuter = (e) => { 
                        document.removeEventListener('click', closeOuter); 
                        if(document.getElementById('radial-skills')) document.getElementById('radial-skills').remove(); 
                    };
                    document.addEventListener('click', closeOuter);
                }, 100);
            }
        };

        function loadDeck(newCategories, animateSlot = false) {
            let combinedCategories = newCategories;
            // Phase 19: Prepend new combat categories to default categories allowing horizontal swipe review
            if (animateSlot && newCategories !== defaultCategories) {
                combinedCategories = [...newCategories, ...defaultCategories];
            }

            categories = combinedCategories;
            const container = document.getElementById('guides-container');
            container.innerHTML = '';
            
            categories.forEach((cat, idx) => {
                const col = document.createElement('div'); col.className = 'card-column'; col.id = `col-${idx}`;
                
                let startY = 0, isDragging = false;
                col.onpointerdown = (e) => { 
                    startY = e.clientY; 
                    isDragging = true; 
                    col.setPointerCapture(e.pointerId); 
                    const topCard = col.querySelector('.guide-card[data-depth="0"]');
                    if (topCard) topCard.style.transition = 'none';
                };
                
                col.onpointermove = (e) => { 
                    if(!isDragging) return; 
                    const deltaY = e.clientY - startY; 
                    const topCard = col.querySelector('.guide-card[data-depth="0"]');
                    
                    if (topCard) {
                        topCard.style.transform = `translateY(${deltaY}px) scale(1)`;
                    }

                    if(Math.abs(deltaY) > 50) { 
                        if (topCard) {
                            topCard.style.transition = '';
                            topCard.style.transform = '';
                        }
                        cycle(idx, deltaY > 0); 
                        startY = e.clientY; 
                        document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show')); 
                        
                        // Grab new top card for continuous dragging
                        const newTop = col.querySelector('.guide-card[data-depth="0"]');
                        if (newTop) newTop.style.transition = 'none';
                    } 
                };
                
                const endDrag = (e) => {
                    isDragging = false; 
                    col.releasePointerCapture(e.pointerId); 
                    const topCard = col.querySelector('.guide-card[data-depth="0"]');
                    if (topCard) {
                        topCard.style.transition = '';
                        topCard.style.transform = '';
                    }
                };
                col.onpointerup = endDrag;
                col.onpointercancel = endDrag;

                cat.cards.forEach((cardData, i) => {
                    // Check if cardData is an object or string for backwards compatibility
                    const isObj = typeof cardData === 'object';
                    const cName = isObj ? cardData.name : cardData;
                    const cId = isObj ? cardData.id : cat.id;
                    const cKanji = isObj ? cardData.kanji : cat.kanji || '';
                    const cDesc = isObj ? cardData.desc : cat.desc;
                    const cAttr = isObj ? cardData.attr : cat.attr || '';
                    
                    const card = document.createElement('div');
                    card.className = `guide-card card-${(cId === 'KATANA' || cId === 'SHIELD') ? 'item' : cId.toLowerCase()}`;
                    if (animateSlot) {
                        card.classList.add('slot-anim');
                        card.style.animationDelay = (idx * 0.1) + 's'; // Stagger Columns
                    }
                    card.dataset.depth = i;
                    card.innerHTML = `
                        <div class="card-header"><span class="card-kanji">${cKanji}</span><span class="card-type-pill">${cId}</span></div>
                        <div class="card-title">${cName}</div><div class="card-desc">${cDesc}</div>
                        <div class="card-icon-3d" data-element="${cId}"><canvas></canvas></div>
                        <div class="card-attr-fused">${cAttr}</div>
                        <div class="card-tooltip">
                            <div class="tt-title">${cName}</div>
                            <div class="tt-desc">${cDesc}</div>
                            <div class="tt-help">DBL-CLICK/ENTER TO USE</div>
                        </div>
                    `;
                    card.onclick = (e) => {
                        e.stopPropagation();
                        setFocus(idx);
                        document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                        
                        if(card.dataset.depth === "0") {
                            // Execute natively on single tap for fast combat UX
                            card.classList.add('launching');
                            setTimeout(() => {
                                emitAction('COMBAT_SPELL', { id: cId, name: cName, effect: cAttr });
                                card.classList.remove('launching');
                                // Force cycle down after throwing spell
                                cycle(idx, true);
                            }, 400);
                        } else {
                            // Cycle the stack up to bring this card to the front
                            cycle(idx, true);
                        }
                    };
                    card.ondblclick = (e) => {
                        e.stopPropagation();
                        // Redundant fallback for desktop users, though CSS touch-action blocks iOS zoom
                        if(card.dataset.depth === "0") {
                            document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                            card.classList.add('launching');
                            setTimeout(() => {
                                emitAction('COMBAT_SPELL', { id: cId, name: cName, effect: cAttr });
                                card.classList.remove('launching');
                                cycle(idx, true);
                            }, 400);
                        }
                    };
                    col.appendChild(card);
                });
                container.appendChild(col);
                
                // Phase 23: ADSR Slot Animation Reel Fall
                if (animateSlot && idx < newCategories.length) {
                    const deckCards = Array.from(col.querySelectorAll('.guide-card'));
                    deckCards.forEach((c, cIdx) => {
                        c.classList.add('slot-anim');
                        c.style.animationDuration = '1.0s';
                        c.style.animationDelay = `${(idx * 0.1) + (cIdx * 0.05)}s`;
                    });
                }
            });
            
            // Phase 19: Scroll container hard left instantly
            container.scrollTo({ left: 0, behavior: 'instant' });
            setFocus(0, false);
            
            // Re-attach hover focus states to newly generated UI
            document.querySelectorAll('.u-panel').forEach(p => { 
                p.onmouseenter = () => p.focus(); 
                p.onmouseleave = () => p.blur(); 
            });
        }
        document.getElementById('launch-btn').onclick = function(e) { 
            e.preventDefault();
            emitAction(pendingAction, this); 
            closeModal(); 
        };
        
        // --- LCD EVENT PANEL LOGIC ---
        const lcdPanel = document.getElementById('lcd-event-panel');
        const lcdHeader = document.getElementById('lcd-header');
        const lcdText = document.getElementById('lcd-text');
        let lcdTimeout = null;
        let isLcdDragging = false, lcdStartX, lcdStartY, lcdStartLeft, lcdStartTop;

        window.showLcdEvent = function(text) {
            if (!lcdPanel || !lcdText) return;
            lcdText.textContent = text.substring(0, 8); // Hardware cap ~8 chars
            lcdPanel.classList.add('active');
            if (lcdTimeout) clearTimeout(lcdTimeout);
            lcdTimeout = setTimeout(() => {
                lcdPanel.classList.remove('active');
            }, 2000);
        };

        if (lcdHeader && lcdPanel) {
            lcdHeader.addEventListener('pointerdown', (e) => {
                isLcdDragging = true;
                lcdStartX = e.clientX;
                lcdStartY = e.clientY;
                const rect = lcdPanel.getBoundingClientRect();
                lcdStartLeft = rect.left;
                lcdStartTop = rect.top;
                // De-couple from flexible transform positioning
                lcdPanel.style.transform = 'none';
                lcdPanel.style.left = lcdStartLeft + 'px';
                lcdPanel.style.top = lcdStartTop + 'px';
                lcdHeader.setPointerCapture(e.pointerId);
            });
            
            lcdHeader.addEventListener('pointermove', (e) => {
                if (!isLcdDragging) return;
                const dx = e.clientX - lcdStartX;
                const dy = e.clientY - lcdStartY;
                lcdPanel.style.left = (lcdStartLeft + dx) + 'px';
                lcdPanel.style.top = (lcdStartTop + dy) + 'px';
            });
            
            lcdHeader.addEventListener('pointerup', (e) => {
                isLcdDragging = false;
                lcdHeader.releasePointerCapture(e.pointerId);
            });
        }
        
        // Touch / Mouse D-Pad Controls
        const handleDPadInput = (e, isDown) => {
            e.preventDefault();
            const btn = e.target.closest('[data-key]');
            if (!btn) return;
            const key = btn.dataset.key;
            if (isDown) {
                window.parent.postMessage({ type: 'KEY_DOWN', key: key, code: key }, '*');
            } else {
                window.parent.postMessage({ type: 'KEY_UP', key: key, code: key }, '*');
            }
        };

        const leftPanel = document.getElementById('left-panel');
        leftPanel.addEventListener('mousedown', e => handleDPadInput(e, true));
        leftPanel.addEventListener('mouseup', e => handleDPadInput(e, false));
        leftPanel.addEventListener('mouseleave', e => handleDPadInput(e, false));
        
        leftPanel.addEventListener('touchstart', e => handleDPadInput(e, true), {passive: false});
        leftPanel.addEventListener('touchend', e => handleDPadInput(e, false), {passive: false});
        leftPanel.addEventListener('touchcancel', e => handleDPadInput(e, false), {passive: false});

        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        if (mode === 'combat') {
            document.getElementById('lower-ui-row').style.display = 'none';
            document.body.classList.remove('focus-active');
        } else if (mode === 'dock') {
            document.getElementById('encounter-zone').style.display = 'none';
        }

        window.addEventListener('keydown', e => {
            window.parent.postMessage({ type: 'KEY_DOWN', key: e.key, code: e.code }, '*');
            if (e.key === 'Escape') { closeModal(); if(document.activeElement.classList.contains('u-panel')) document.activeElement.blur(); return; }
            if (e.key === 'Tab') return;
            if (!document.activeElement.classList.contains('u-panel')) return;
            if (document.activeElement.id === 'bottom-panel') {
                if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    focusedColIndex = e.key === 'ArrowLeft' ? Math.max(0, focusedColIndex - 1) : Math.min(categories.length - 1, focusedColIndex + 1);
                    setFocus(focusedColIndex);
                    document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                    const topCard = document.querySelector(`#col-${focusedColIndex} .guide-card[data-depth="0"]`);
                    if(topCard) {
                        const tt = topCard.querySelector('.card-tooltip');
                        if(tt) tt.classList.add('show');
                    }
                } else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault();
                    document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                    cycle(focusedColIndex, e.key === 'ArrowDown');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const topCard = document.querySelector(`#col-${focusedColIndex} .guide-card[data-depth="0"]`);
                    if(topCard) {
                        const name = topCard.querySelector('.card-title').textContent;
                        document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                        emitAction(name, topCard);
                    }
                }
            }
        });

        function submitChat() {
            const cmdInput = document.getElementById('command-input');
            if (cmdInput && cmdInput.value.trim() !== '') {
                window.parent.postMessage({ type: 'CHAT_SUBMIT', text: cmdInput.value.trim() }, '*');
                cmdInput.value = '';
            }
        }
        
        // Expose submitChat globally for the button onclick
        window.submitChat = submitChat;

        // Auto-submit chat on Enter from the input specifically
        const cmdInput = document.getElementById('command-input');
        if (cmdInput) {
            cmdInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    submitChat();
                    e.stopPropagation(); // Prevents panel listener from picking it up
                }
            });
        }
        window.addEventListener('keyup', e => {
            window.parent.postMessage({ type: 'KEY_UP', key: e.key, code: e.code }, '*');
        });
        
        // --- Safely bind Avatar Menu Ring Trigger ---
        document.getElementById('player-avatar-container').addEventListener('click', () => {
            const az = document.getElementById('action-zone');
            if(az) az.classList.toggle('outer-active');
        });

        setup();

        // Listen for combat state changes from main relay
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'SHOW_COMBAT') {
                document.getElementById('encounter-zone').classList.add('active');
                
                if (e.data.playerHp !== undefined && e.data.playerMaxHp !== undefined) {
                    const pHpText = document.getElementById('player-hp-text');
                    const pHpBar = document.getElementById('player-hp-bar');
                    if (pHpText) pHpText.textContent = `${e.data.playerHp}/${e.data.playerMaxHp} HP`;
                    if (pHpBar) pHpBar.style.width = `${Math.max(0, (e.data.playerHp / e.data.playerMaxHp) * 100)}%`;
                }
                
                if (e.data.enemyHp !== undefined && e.data.enemyMax !== undefined) {
                    const eHpBar = document.getElementById('enemy-hp-bar');
                    if (eHpBar) eHpBar.style.width = `${Math.max(0, (e.data.enemyHp / e.data.enemyMax) * 100)}%`;
                    // eHpText is hidden per classical RPGs, just show the bar, but we can update the status text
                    const eStatusText = document.getElementById('enemy-status-text');
                    if (eStatusText) {
                        let distDesc = e.data.distance ? `<br><span class="dist-text">${Math.max(0, (e.data.distance * 10) - 10).toFixed(0)} ft</span>` : '';
                        eStatusText.innerHTML = `LVL 1 • AC 10${distDesc}`;
                    }
                }
            } else if (e.data && (e.data.type === 'HIDE_COMBAT' || e.data.type === 'HIDE_ALL')) {
                document.getElementById('encounter-zone').classList.remove('active');
                if (window.emitAction) window.emitAction('END_ATTACK'); // Force reset player UI and reset deck
            } else if (e.data && e.data.type === 'COMBAT_ATTACK') {
                // If the player steps forward into the monster (bump attack), pop out Katana cards!
                loadDeck(combatCategories);
            } else if (e.data && e.data.type === 'LCD_EVENT') {
                if (window.showLcdEvent) window.showLcdEvent(e.data.text || "SYS_ERR");
            } else if (e.data && e.data.type === 'PLAYER_MOVE_STATE') {
                if (e.data.isMoving) {
                    document.body.classList.add('is-moving');
                    if (avatarAction && !avatarAction.isRunning()) avatarAction.play();
                    hideExitModal(); // Hide if player walks away
                }
                else {
                    document.body.classList.remove('is-moving');
                    if (avatarAction) avatarAction.stop(); // Stops gracefully, returning model to standing Idle
                }
            } else if (e.data && e.data.type === 'SHOW_EXIT') {
                showExitModal();
            } else if (e.data && e.data.type === 'HIDE_EXIT') {
                if(exitModalActive) hideExitModal();
            }
        });

        // Viewport Readout Logic
        function updateViewportReadout() {
            const readout = document.getElementById('viewport-readout');
            if (readout) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                let device = 'Mobile';
                if (w >= 1024) device = 'Desktop';
                else if (w >= 640) device = 'Tablet';
                readout.textContent = `(Viewport:${device} [${w}x${h}])`;
            }
        }
        window.addEventListener('resize', updateViewportReadout);
        setTimeout(updateViewportReadout, 100); // Initial call after DOM paints
        updateViewportReadout();

        // Parley VFX Effect
        window.triggerParley = () => {
            const cmdInput = document.getElementById('command-input');
            const chatPill = document.querySelector('.chat-pill');
            if (cmdInput && chatPill) {
                cmdInput.focus();
                chatPill.style.transition = 'box-shadow 0.3s ease';
                chatPill.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.8), inset 0 0 15px rgba(0, 255, 255, 0.5)';
                
                // Clear bloom soon after to prevent infinite glowing or wait for blur
                cmdInput.addEventListener('blur', function cleanup() {
                    chatPill.style.boxShadow = '2px 2px 8px var(--nm-shadow-dark)'; // Restore normal Neumorphic shadow
                    cmdInput.removeEventListener('blur', cleanup);
                });
            }
        };
    // --- RESOLUTION PLACEHOLDER SCRIPT ---
    function updateResolutionPlaceholder() {
        const cmdInput = document.getElementById('dnd-adventure-command-input');
        const resLabel = document.getElementById('lcd-res-display');
        if(cmdInput) {
            cmdInput.placeholder = `ACTION...`;
        }
        if(resLabel) {
            resLabel.innerText = `[${window.innerWidth}x${window.innerHeight}]`;
        }
    }
    // --- THREE.JS DYNAMIC RESIZE ENGINE ---
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        // Update FPV Renderer
        const fpvV = document.getElementById('fpv-viewport');
        if(fpvV && window.fpvRenderer && window.fpvCamera) {
            window.fpvCamera.aspect = fpvV.clientWidth / fpvV.clientHeight;
            window.fpvCamera.updateProjectionMatrix();
            window.fpvRenderer.setSize(fpvV.clientWidth, fpvV.clientHeight, false);
        }
        
        // Update Map Renderer
        const mapV = document.getElementById('mapview-container');
        if(mapV && window.renderer && window.camera) {
            window.camera.aspect = mapV.clientWidth / mapV.clientHeight;
            window.camera.updateProjectionMatrix();
            window.renderer.setSize(mapV.clientWidth, mapV.clientHeight, false);
        }
    });

    window.addEventListener('resize', updateResolutionPlaceholder);
    window.addEventListener('load', updateResolutionPlaceholder);
    setTimeout(updateResolutionPlaceholder, 500);
    

/* ---------- NEXT SCRIPT BLOCK ---------- */

