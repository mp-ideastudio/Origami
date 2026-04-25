
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        // Fix for missing toggleRing action buttons
        window.toggleRing = function() {
            const az = document.getElementById('action-zone');
            if(az) az.classList.toggle('outer-active');
        };

        window.openInventory = function() {
            const modal = document.getElementById('inventory-modal');
            if(modal) {
                modal.classList.add('active');
                window.renderInventory();
            }
        };

        window.closeInventory = function() {
            const modal = document.getElementById('inventory-modal');
            if(modal) modal.classList.remove('active');
        };

        window.renderInventory = function() {
            const content = document.getElementById('inv-content');
            if(!content) return;
            content.innerHTML = '';
            
            // Re-use logic from deck building to render cards statically
            // Group by Nethack Rules: Weapons, Armor, Spells, Items
            
            const nethackGroups = {
                'Weapons': [],
                'Armor': [],
                'Spells': [],
                'Items': []
            };

            // Analyze player's collected cards (window.cardInventoryCounts)
            const inventory = window.cardInventoryCounts || {};
            
            // Map known categories to Nethack types
            const weaponTypes = ['KATANA', 'MISSILE', 'SLASH', 'THRUST'];
            const armorTypes = ['SHIELD', 'ARMOR'];
            const spellTypes = ['FIRE', 'WATER', 'EARTH', 'WIND', 'SPELL'];
            const itemTypes = ['SCROLL', 'POTION', 'WAND'];

            // We need a helper to find the card info from default/combat categories
            const allDefs = [...defaultCategories, ...combatCategories];
            const getCardDef = (cardName) => {
                for (let cat of allDefs) {
                    if (cat.cards && cat.cards.includes(cardName)) return cat;
                }
                return { id: 'MISC', kanji: '？', desc: 'Unknown', attr: 'N/A' };
            };

            for (let [cardName, count] of Object.entries(inventory)) {
                const def = getCardDef(cardName);
                
                let targetGroup = 'Items';
                if (weaponTypes.includes(def.id) || weaponTypes.includes(cardName)) targetGroup = 'Weapons';
                else if (armorTypes.includes(def.id) || armorTypes.includes(cardName)) targetGroup = 'Armor';
                else if (spellTypes.includes(def.id) || spellTypes.includes(cardName)) targetGroup = 'Spells';

                nethackGroups[targetGroup].push({ cardName, count, def });
            }

            // Create HTML structures
            for (let [groupName, cards] of Object.entries(nethackGroups)) {
                if (cards.length === 0) continue;
                
                const section = document.createElement('div');
                section.className = 'inv-category';
                section.innerHTML = `<div class="inv-category-title">${groupName}</div><div class="inv-grid"></div>`;
                const grid = section.querySelector('.inv-grid');
                
                cards.forEach(c => {
                    // Create the static card element based on createCardElement logic
                    const cardEl = document.createElement('div');
                    const isCardItem = window.MasterCardDatabase && window.MasterCardDatabase.CardCategories && window.MasterCardDatabase.CardCategories[c.def.categoryId] && window.MasterCardDatabase.CardCategories[c.def.categoryId].isItem;
                    cardEl.className = 'guide-card playing-card' + (isCardItem ? ' card-item' : '');
                    cardEl.style.cssText = 'position:relative; filter:none; opacity:1; transform:none; margin:0;';
                    cardEl.setAttribute('draggable', 'true');
                    
                    const badgeHtml = c.count > 1 ? `<div class="card-badge">${c.count}</div>` : '';
                    let themeClr = '#66BB6A';
                    if (c.def.id === 'SPELL' || c.def.id === 'WIND') themeClr = '#90a4ae';
                    else if (c.def.id === 'DEFEND' || c.def.id === 'EARTH') themeClr = '#00bcd4';
                    else if (c.def.id === 'THRUST' || c.def.id === 'WATER') themeClr = '#0d6efd';
                    else if (c.def.id === 'SLASH' || c.def.id === 'FIRE' || c.def.id === 'KATANA') themeClr = '#f44336';
                    else themeClr = '#e91e63'; 
                    cardEl.style.setProperty('--theme-clr', themeClr);

                    cardEl.innerHTML = `
                        <div class="equip-badge">E</div>
                        ${badgeHtml}
                        <div class="card-header">
                            <div class="card-kanji" style="color: ${themeClr}">${c.def.kanji}</div>
                            <span class="card-type-pill" style="background: ${themeClr}">${isCardItem ? 'ITEM' : c.def.id}</span>
                        </div>
                        <div class="card-title">${c.cardName}</div>
                        <div class="card-desc">${c.def.desc}</div>
                        <div class="card-icon-3d"><div class="canvas-mount"></div></div>
                        <div class="card-attr">${c.def.attr}</div>
                    `;
                    
                    // Click to equip
                    cardEl.addEventListener('click', () => {
                        cardEl.classList.toggle('equipped-card');
                    });

                    // Drag and Drop functionality
                    cardEl.addEventListener('dragstart', (e) => {
                        cardEl.classList.add('dragging');
                        e.dataTransfer.effectAllowed = 'move';
                        // Need a slight delay to allow the drag image to form before we modify the DOM element
                        setTimeout(() => cardEl.style.opacity = '0.4', 0);
                    });
                    cardEl.addEventListener('dragend', () => {
                        cardEl.classList.remove('dragging');
                        cardEl.style.opacity = '';
                    });
                    cardEl.addEventListener('dragover', (e) => {
                        e.preventDefault(); // Necessary to allow dropping
                        cardEl.classList.add('drag-over');
                    });
                    cardEl.addEventListener('dragleave', () => {
                        cardEl.classList.remove('drag-over');
                    });
                    cardEl.addEventListener('drop', (e) => {
                        e.preventDefault();
                        cardEl.classList.remove('drag-over');
                        const draggingEl = grid.querySelector('.dragging');
                        if (draggingEl && draggingEl !== cardEl) {
                            const rect = cardEl.getBoundingClientRect();
                            const midX = rect.left + rect.width / 2;
                            if (e.clientX < midX) {
                                grid.insertBefore(draggingEl, cardEl);
                            } else {
                                grid.insertBefore(draggingEl, cardEl.nextSibling);
                            }
                        }
                    });

                    // We can reuse the 3D icons by spawning them in the canvas-mount
                    grid.appendChild(cardEl);
                    
                    // Delay icon generation slightly to let DOM mount
                    setTimeout(() => {
                        const mount = cardEl.querySelector('.canvas-mount');
                        if (mount && scenes[c.def.id]) {
                            const cvs = document.createElement('canvas');
                            mount.appendChild(cvs);
                            const ctx = cvs.getContext('2d');
                            cvs.width = 180; cvs.height = 180;
                            cvs.style.width = "45px"; cvs.style.height = "45px";
                            cvs.style.position = 'absolute'; cvs.style.top = '0'; cvs.style.left = '0';
                            
                            // Render static frame
                            const cached = scenes[c.def.id];
                            avatarRenderer.setRenderTarget(cached.rt);
                            avatarRenderer.render(cached.scene, avatarCamera);
                            ctx.drawImage(avatarRenderer.domElement, 0, 0, 180, 180);
                            avatarRenderer.setRenderTarget(null);
                        }
                    }, 50);
                });
                
                content.appendChild(section);
            }
            
            if(content.innerHTML === '') {
                content.innerHTML = '<div style="color:#666; font-style:italic;">Your inventory is empty.</div>';
            }
        };

        function buildCategoriesFromDB(isCombat) {
            if (!window.MasterCardDatabase) return [];
            const cats = window.MasterCardDatabase.CardCategories;
            const defs = window.MasterCardDatabase.CardDefinitions;
            const groups = {};
            Object.values(defs).forEach(def => {
                const isCombatCard = ['KATANA', 'MISSILE', 'DEFEND'].includes(def.categoryId);
                if (isCombat && !isCombatCard && def.categoryId !== 'POTION') return;
                if (!isCombat && isCombatCard) return;

                const isItemCategory = ['POTION', 'SCROLL', 'ARMOR'].includes(def.categoryId);
                const groupKey = isItemCategory ? 'ITEM' : def.categoryId;

                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        id: isItemCategory ? 'ITEM' : cats[def.categoryId].id,
                        icon3d: isItemCategory ? 'POTION' : def.categoryId, // Use potion 3D model as default for the mixed item stack
                        kanji: isItemCategory ? '具' : cats[def.categoryId].kanji,
                        icon: isItemCategory ? 'fa-box' : cats[def.categoryId].icon,
                        desc: isItemCategory ? 'Inventory Items' : cats[def.categoryId].desc,
                        attr: isItemCategory ? '(GEAR)' : cats[def.categoryId].attr,
                        isItem: isItemCategory,
                        cards: []
                    };
                }
                groups[groupKey].cards.push(def.id);
            });
            return Object.values(groups);
        }

        const defaultCategories = buildCategoriesFromDB(false);
        const combatCategories = buildCategoriesFromDB(true);

        let categories = defaultCategories;

        let focusedColIndex = 0, pendingAction = null, activeCardElement = null, wheelThrottle = false;
        let isKeyboardSelectorActive = false;

        function toggleKeyboardSelector() {
            isKeyboardSelectorActive = !isKeyboardSelectorActive;
            if (isKeyboardSelectorActive) {
                document.body.classList.add('keyboard-selector-active');
                setFocus(focusedColIndex);
                updateSuperimposedCard();
            } else {
                document.body.classList.remove('keyboard-selector-active');
                document.querySelectorAll('.guide-card.superimposed-card').forEach(c => c.classList.remove('superimposed-card'));
            }
        }

        function updateSuperimposedCard() {
            document.querySelectorAll('.guide-card.superimposed-card').forEach(c => c.classList.remove('superimposed-card'));
            if (!isKeyboardSelectorActive) return;
            const col = document.getElementById(`col-${focusedColIndex}`);
            if (col) {
                const topCard = col.querySelector('.guide-card[data-depth="0"]');
                if (topCard) topCard.classList.add('superimposed-card');
            }
        }
        const scenes = {}, dpr = window.devicePixelRatio || 1;
        
        let avatarMixer = null;
        let avatarActions = {};
        let avatarCurrentAction = null;
        let avatarIdleAction = null;
        let avatarScene, avatarCamera, avatarRenderer, avatarClock;

        function init3DIcons() {
            const elements = ['EARTH', 'WATER', 'FIRE', 'WIND', 'SCROLL', 'POTION', 'KATANA', 'MISSILE', 'DEFEND', 'DICE_EVEN', 'DICE_ODD', 'DICE_CENTER'];
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: false });
            renderer.setClearColor(0x000000, 0); // Critial fix to prevent black squares
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.setSize(256, 256, false); // Fixed high-res buffer to prevent FBO thrashing
            
            elements.forEach(el => {
                const scene = new THREE.Scene();
                scene.add(new THREE.AmbientLight(0xffffff, 0.6));
                const dir = new THREE.DirectionalLight(0xffffff, 2.2);
                dir.position.set(5, 5, 5); scene.add(dir);
                
                const mat = new THREE.MeshStandardMaterial({ 
                    color: { EARTH: 0x5C4033, WATER: 0xffffff, FIRE: 0xb71c1c, WIND: 0x37474f, SCROLL: 0x1b5e20 }[el] || 0x444444,
                    roughness: 0.15, metalness: 0.4, flatShading: true, side: THREE.DoubleSide 
                });
                
                let group = new THREE.Group(), update;
                const categoryDb = window.MasterCardDatabase && window.MasterCardDatabase.CardCategories[el];
                if (categoryDb && categoryDb.build3DIcon) {
                    const iconData = categoryDb.build3DIcon(THREE);
                    group.add(iconData.group);
                    update = iconData.update;
                } else if (el === 'DICE_EVEN' || el === 'DICE_ODD' || el === 'DICE_CENTER') {
                    const dieGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
                    const dieMat = new THREE.MeshStandardMaterial({
                        color: el === 'DICE_CENTER' ? 0xffffff : 0xffffff, 
                        roughness: 0.2, metalness: 0.1
                    });
                    
                    if (el === 'DICE_CENTER') {
                        // Two completely mapped 3D Dice
                        function createDie() {
                            const mat = new THREE.MeshStandardMaterial({
                                color: 0xffffff, 
                                emissive: 0xffffff,
                                emissiveIntensity: 0.6, /* Bright white to match symbols */
                                roughness: 1.0, metalness: 0.0 /* Flat non-metallic */
                            });
                            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat);
                            
                            const dotGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
                            const dotMat = new THREE.MeshStandardMaterial({
                                color: 0x000000, 
                                roughness: 1.0, 
                                metalness: 0.0
                            });
                            mesh.userData.dotMat = dotMat;
                            
                            function addDot(x, y, z, rx, ry, rz) {
                                const d = new THREE.Mesh(dotGeo, dotMat);
                                d.position.set(x, y, z);
                                if (rx) d.rotation.x = rx;
                                if (ry) d.rotation.y = ry;
                                if (rz) d.rotation.z = rz;
                                mesh.add(d);
                            }

                            // Side 1: +Z (1 dot)
                            addDot(0, 0, 0.61, Math.PI/2, 0, 0);
                            
                            // Side 6: -Z (6 dots)
                            for(let dx of [-0.3, 0.3]) for(let dy of [-0.3, 0, 0.3]) addDot(dx, dy, -0.61, Math.PI/2, 0, 0);
                            
                            // Side 2: +Y (2 dots)
                            addDot(-0.3, 0.61, -0.3, 0, 0, 0);
                            addDot(0.3, 0.61, 0.3, 0, 0, 0);

                            // Side 5: -Y (5 dots)
                            addDot(0, -0.61, 0, 0, 0, 0);
                            for(let dx of [-0.3, 0.3]) for(let dz of [-0.3, 0.3]) addDot(dx, -0.61, dz, 0, 0, 0);

                            // Side 3: +X (3 dots)
                            addDot(0.61, 0, 0, 0, 0, Math.PI/2);
                            addDot(0.61, 0.3, -0.3, 0, 0, Math.PI/2);
                            addDot(0.61, -0.3, 0.3, 0, 0, Math.PI/2);

                            // Side 4: -X (4 dots)
                            for(let dy of [-0.3, 0.3]) for(let dz of [-0.3, 0.3]) addDot(-0.61, dy, dz, 0, 0, Math.PI/2);
                            return mesh;
                        }

                        const d1 = createDie(true); d1.position.set(-0.8, 0, 0);
                        const d2 = createDie(false); d2.position.set(0.8, 0, 0);
                        
                        group.add(d1, d2);
                        update = (t) => {
                            if (window.diceSettleTime === undefined) window.diceSettleTime = -5000;
                            const speedMode = window.diceAttackSpin || 1.0;
                            if (window.diceAttackSpin > 1.0) window.diceAttackSpin -= 0.5; // Decay
                            
                            const dt = 0.016 * speedMode;
                            
                            if (speedMode > 1.1) {
                                d1.rotation.x += dt * 0.8; d1.rotation.y += dt * 1.1;
                                d2.rotation.x -= dt * 0.8; d2.rotation.y -= dt * 1.1;
                                window.diceSettleTime = performance.now();
                                d1.userData.targetRx = Math.round(d1.rotation.x / (Math.PI/2)) * (Math.PI/2);
                                d1.userData.targetRy = Math.round(d1.rotation.y / (Math.PI/2)) * (Math.PI/2);
                                d2.userData.targetRx = Math.round(d2.rotation.x / (Math.PI/2)) * (Math.PI/2);
                                d2.userData.targetRy = Math.round(d2.rotation.y / (Math.PI/2)) * (Math.PI/2);
                            } else {
                                const settleAge = performance.now() - window.diceSettleTime;
                                if (settleAge < 5000) {
                                    // Interpolate to locked orthogonal faces ("land on numbers")
                                    d1.rotation.x += (d1.userData.targetRx - d1.rotation.x) * 0.15;
                                    d1.rotation.y += (d1.userData.targetRy - d1.rotation.y) * 0.15;
                                    d1.rotation.z += (0 - d1.rotation.z) * 0.15;
                                    d2.rotation.x += (d2.userData.targetRx - d2.rotation.x) * 0.15;
                                    d2.rotation.y += (d2.userData.targetRy - d2.rotation.y) * 0.15;
                                    d2.rotation.z += (0 - d2.rotation.z) * 0.15;
                                } else {
                                    // Resume normal lazy roll
                                    d1.rotation.x += dt * 0.8; d1.rotation.y += dt * 1.1;
                                    d2.rotation.x -= dt * 0.8; d2.rotation.y -= dt * 1.1;
                                }
                                
                                // Cleanly interpolate all bobbing/floating toward 0 while settled!
                                const isFrozen = (settleAge > 0 && settleAge < 5000 && speedMode <= 1.1);
                                const targetGrpY = isFrozen ? 0 : Math.sin(t * 0.5) * 0.3;
                                const targetD1Y = isFrozen ? 0 : Math.sin(t*2)*0.1;
                                const targetD2Y = isFrozen ? 0 : Math.cos(t*2)*0.1;
                                
                                group.rotation.y += (targetGrpY - group.rotation.y) * 0.15;
                                d1.position.y += (targetD1Y - d1.position.y) * 0.15;
                                d2.position.y += (targetD2Y - d2.position.y) * 0.15;
                            }
                            
                            const settleAge = performance.now() - (window.diceSettleTime || 0);
                            
                            // 1. Keep main cube bodies dark
                            d1.material.emissiveIntensity = 0;
                            d2.material.emissiveIntensity = 0;
                            
                            // 2. Sequential Counting Sequence (Only active once landed and settled)
                            if (speedMode <= 1.1 && settleAge > 0 && settleAge < 1500) {
                                d1.userData.dotMat.emissive.setHex(0x00ffa5);
                                d2.userData.dotMat.emissive.setHex(0x00ffa5);
                                
                                let f1 = 0, f2 = 0;
                                if (settleAge > 200 && settleAge <= 450) { f1 = 4.0; } // Die 1 Count
                                else if (settleAge > 600 && settleAge <= 850) { f2 = 4.0; } // Die 2 Count
                                else if (settleAge > 1000 && settleAge <= 1150) { f1 = 4.0; f2 = 4.0; } // Blink 1
                                else if (settleAge > 1300 && settleAge <= 1450) { f1 = 4.0; f2 = 4.0; } // Blink 2

                                d1.userData.dotMat.emissiveIntensity = f1;
                                d2.userData.dotMat.emissiveIntensity = f2;
                            } else {
                                d1.userData.dotMat.emissiveIntensity = 0;
                                d2.userData.dotMat.emissiveIntensity = 0;
                            }
                        };
                    } else {
                        // Original Single Die logic
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
                            die.rotation.x = t * (el === 'DICE_EVEN' ? 2.5 : -2.5); 
                            die.rotation.y = t * 3.1; 
                            die.rotation.z = Math.sin(t*2);
                        };
                    }
                }
                scene.add(group); scenes[el] = { scene, update };
            });

            avatarClock = new THREE.Clock();
            
            // Single Global Camera for all 3D Icons
            const iconCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); 
            iconCamera.position.set(0, 0, 7.5);
            
            let lastRender = 0;
            const canvasCache = {};
            
            function renderLoop(time) {
                requestAnimationFrame(renderLoop);
                
                // Throttle to 30 FPS for UI components
                if (time - lastRender < 33) return;
                lastRender = time;
                
                // Optimization: Do not render heavy 3D icons or avatars when the main dock is hidden
                const encounterZone = document.getElementById('encounter-zone');
                const uiRowHidden = document.getElementById('lower-ui-row') ? document.getElementById('lower-ui-row').style.display === 'none' : false;
                if (uiRowHidden && (!encounterZone || !encounterZone.classList.contains('active'))) return;
                
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

                // Update rotational logic for all 3D components
                elements.forEach(el => { if (scenes[el] && scenes[el].update) scenes[el].update(t); });

                // Regenerate canvas cache every 500ms to avoid DOM polling spikes
                if (time - canvasCache.lastScan > 500 || !canvasCache.lastScan) {
                    canvasCache.lastScan = time;
                    canvasCache.elements = document.querySelectorAll(
                        '.guide-card[data-depth="0"] .card-icon-3d, .wager-card .card-icon-3d, .kp-center-btn[data-element="DICE_CENTER"], .kp-center-btn[data-icon="DICE_CENTER"], #floating-loot-layer .card-icon-3d'
                    );
                }

                if (canvasCache.elements) {
                    canvasCache.elements.forEach(container => {
                        const el = container.dataset.element || container.dataset.icon;
                        if (!el || !scenes[el]) return;
                        
                        const cvs = container.querySelector('canvas') || (container.firstChild && container.firstChild.nodeName === 'CANVAS' ? container.firstChild : null);
                        if (!cvs) return;

                        const cw = cvs.clientWidth, ch = cvs.clientHeight;
                        if (cw === 0 || ch === 0) return; 
                        const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
                        if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
                        
                        renderer.render(scenes[el].scene, iconCamera);
                        
                        const ctx = cvs.getContext('2d'); 
                        if (ctx) { ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h); }
                    });
                }
            }
            renderLoop(0);
        }

        function initAvatar() {
            const container = document.getElementById('player-avatar-container');
            if (!container) return;
            
            const w = container.clientWidth || 58;
            const h = container.clientHeight || 58;
            
            avatarRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: false });
            avatarRenderer.setClearColor(0x000000, 0); // Crucial fix for black square bounds
            avatarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            avatarRenderer.setSize(w, h);
            container.appendChild(avatarRenderer.domElement);
            
            avatarScene = new THREE.Scene();
            avatarCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
            avatarCamera.position.set(0, 1.2, 4.8);
            avatarCamera.lookAt(0, 0.85, 0); // Look lower so the avatar moves UP (+1px) and its legs aren't covered
            
            const ambLight = new THREE.AmbientLight(0xffffff, 1.5); // Brighter ambient light
            avatarScene.add(ambLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 2.0); // Brighter directional
            dirLight.position.set(5, 5, 5);
            avatarScene.add(dirLight);
            
            try {
                const loader = new GLTFLoader();
                // Adding multiple paths fallback logic like FPV does if possible, but trying relative first
                const isLocalFile = window.location.protocol === 'file:';
                const modelUrls = [
                    './assets/models/Player.A.Walking.glb',
                    '../assets/models/Player.A.Walking.glb',
                    'assets/Player.A.Walking.glb',
                    'https://www.markpeterson.info/Origami/assets/Player.A.Walking.glb',
                    'https://markpeterson.info/Origami/assets/Player.A.Walking.glb'
                ];
                
                function tryLoadModel(urlIndex) {
                    if (urlIndex >= modelUrls.length) {
                        if (isLocalFile) {
                            console.log("Avatar 3D load skipped: Browsers block 'file://' CORS fetch requests. Using 2D portrait fallback.");
                        } else {
                            console.warn("Avatar failed to load natively after all attempts. Falling back to 2D portrait.");
                        }
                        container.style.backgroundImage = 'url("assets/models/Player.A.png")';
                        container.style.backgroundPosition = 'center';
                        container.style.backgroundSize = '60%';
                        container.style.backgroundRepeat = 'no-repeat';
                        container.style.backgroundBlendMode = 'multiply';
                        return;
                    }
                    
                    loader.load(modelUrls[urlIndex], (gltf) => {
                        const model = gltf.scene;
                        
                        model.position.set(0, -0.1, 0); // Moved up to add +25px bottom buffer
                        // Rotate to face slightly right layout (isometric feel)
                        model.rotation.y = Math.PI / 8;
                        // Scale 
                        model.scale.set(1.25, 1.25, 1.25);
                        
                        // Prevent material from blowing out to pure white under lighting
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshLambertMaterial({ 
                                    color: 0xcccccc
                                });
                            }
                        });
                        
                        avatarScene.add(model);
                        
                        if (gltf.animations && gltf.animations.length > 0) {
                            avatarMixer = new THREE.AnimationMixer(model);
                            gltf.animations.forEach((anim, i) => {
                                const action = avatarMixer.clipAction(anim);
                                avatarActions[anim.name.toLowerCase()] = action;
                                avatarActions[i] = action;
                            });
                            
                            // Map best matches
                            avatarIdleAction = avatarActions['idle'] || avatarActions['stand'];
                            avatarActions.walk = avatarActions['walk'] || avatarActions['run'] || avatarActions['walking'] || avatarActions[1] || avatarActions[0];
                            avatarActions.slash = avatarActions['attack'] || avatarActions['slash'] || avatarActions[2] || avatarActions[1] || avatarActions.walk;
                            
                            if (!avatarIdleAction) {
                                avatarIdleAction = avatarActions[0] || avatarMixer.clipAction(gltf.animations[0]);
                            }
                            avatarActions['idle'] = avatarIdleAction;
                            
                            // Play idle immediately if it logically exists
                            if (avatarIdleAction) {
                                avatarCurrentAction = avatarIdleAction;
                                if (avatarIdleAction === avatarActions.walk) avatarIdleAction.setEffectiveTimeScale(0);
                                avatarIdleAction.play();
                            }
                        }
                        
                        // Fix metallic/roughness issues that might make it render black
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshLambertMaterial({ 
                                    color: 0xcccccc
                                });
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
            updateSuperimposedCard();
        }

        function setup() {
            loadDeck(categories);
            
            document.getElementById('bottom-panel').onwheel = e => {
                if (document.activeElement.id !== 'bottom-panel' || wheelThrottle) return;
                e.preventDefault(); wheelThrottle = true; cycle(focusedColIndex, e.deltaY > 0); setTimeout(() => wheelThrottle = false, 150);
            };
            const params = new URLSearchParams(window.location.search);
            const mode = params.get('mode');
            if (mode !== 'combat') {
                initAvatar();
            }
        }

        function playAvatarAnim(name) {
            if (!avatarActions || !avatarMixer) return;
            const targetAction = avatarActions[name];
            if (!targetAction || targetAction === avatarCurrentAction) return;

            const btn = document.getElementById('player-avatar-container');
            if (btn) {
                btn.classList.remove('anim-idle-btn', 'anim-walk-btn', 'anim-slash-btn');
                if (name === 'slash' || name === 'attack') btn.classList.add('anim-slash-btn');
                else if (name === 'walk') btn.classList.add('anim-walk-btn');
                else if (name === 'idle') btn.classList.add('anim-idle-btn');
                if (typeof isMoving !== 'undefined' && isMoving) btn.classList.add('anim-walk-btn');
            }

            if (avatarCurrentAction) {
                targetAction.time = 0;
                let timescale = name === 'walk' ? 1.5 : 1;
                // If we fallback to walk animation for idle, pause it so they stand still
                if (name === 'idle' && targetAction === avatarActions['walk']) timescale = 0;
                targetAction.setEffectiveTimeScale(timescale);
                targetAction.setEffectiveWeight(1);
                targetAction.crossFadeFrom(avatarCurrentAction, 0.2, true);
            } else {
                let timescale = name === 'walk' ? 1.5 : 1;
                if (name === 'idle' && targetAction === avatarActions['walk']) timescale = 0;
                targetAction.setEffectiveTimeScale(timescale);
            }
            targetAction.play();
            avatarCurrentAction = targetAction;
            
            if (name === 'slash' || name === 'attack') {
                targetAction.setLoop(THREE.LoopOnce, 1);
                targetAction.clampWhenFinished = true;
                const onFinished = (e) => {
                    if (e.action === targetAction) {
                        avatarMixer.removeEventListener('finished', onFinished);
                        playAvatarAnim('idle');
                    }
                };
                avatarMixer.addEventListener('finished', onFinished);
            } else {
                targetAction.setLoop(THREE.LoopRepeat);
            }
            
            avatarCurrentAction = targetAction;
        }

        function launchModal(card) {
            pendingAction = card.querySelector('.card-title').textContent;
            activeCardElement = card;
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
            console.log("EXITING DUNGEON");
            window.location.reload(); 
            window.parent.location.reload(); // Hard reset game
        };

        // Exit Modal Keyboard Listener (Any key dismisses, only 'y' resets)
        window.addEventListener('keydown', (e) => {
            if (exitModalActive) {
                if (e.key.toLowerCase() === 'y') {
                    window.confirmExit();
                } else {
                    window.hideExitModal();
                }
            }
        });

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
                
                if (btn.dataset.qty !== undefined) {
                    let qty = parseInt(btn.dataset.qty);
                    if (qty > 0) {
                        qty--;
                        btn.dataset.qty = qty;
                        const badge = btn.querySelector('.card-badge');
                        if (badge) badge.textContent = qty;
                        
                        if (qty <= 0) {
                            btn.style.opacity = '0'; // Fade out
                            btn.style.pointerEvents = 'none'; // prevent double clicks during fade
                            const col = btn.parentElement;
                            setTimeout(() => {
                                btn.remove();
                                if (col) {
                                    const remaining = Array.from(col.querySelectorAll('.guide-card'));
                                    if (remaining.length === 0) {
                                        col.remove();
                                    } else {
                                        remaining.forEach((c, idx) => c.dataset.depth = idx.toString());
                                    }
                                }
                            }, 400);
                        }
                    } else if (qty <= 0) {
                        return; // Block action if depleted!
                    }
                }
            }
            
            // Dice UI Toggle
            if (a === 'WAGER') {
                const guideCont = document.getElementById('guides-container');
                const diceCont = document.getElementById('dice-container');
                guideCont.style.opacity = '0';
                setTimeout(() => {
                    guideCont.style.display = 'none';
                    diceCont.classList.add('active');
                }, 400); // Wait for fade out
                return;
            }
            
            if (a === 'BET_EVEN' || a === 'BET_ODD') {
                if (window.playerGold === undefined) window.playerGold = 0;
                const wagerAmount = 10;
                if (window.playerGold < wagerAmount) {
                    emitAction('LOG'); 
                    window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `Not enough gold! You need ${wagerAmount} Gold.` }, '*');
                    return;
                }
                const isEven = (a === 'BET_EVEN');
                if (typeof window.rollDiceAnimation === 'function') window.rollDiceAnimation(isEven, wagerAmount);
                return;
            }

            // Deck Swapping
            if (a === 'ATTACK') {
                playAvatarAnim('slash');
                loadDeck(combatCategories);
            } else if (a === 'RETREAT' || a === 'HIDE') {
                loadDeck(defaultCategories);
            }
        };

        function loadDeck(newCategories) {
            categories = newCategories;
            const container = document.getElementById('guides-container');
            container.innerHTML = '';
            
            categories.forEach((cat, idx) => {
                const col = document.createElement('div'); col.className = 'card-column'; col.id = `col-${idx}`;
                // Interaction Fix: Removed col.draggable = true because the HTML5 drag API 
                // intercepts clicks on macOS/Safari if the mouse moves even 1 pixel during a click.
                col.draggable = false;
                
                col.addEventListener('dragstart', e => {
                    e.dataTransfer.effectAllowed = 'move';
                    col.classList.add('dragging');
                    setTimeout(() => col.style.opacity = '0.5', 0);
                });
                col.addEventListener('dragend', () => {
                    col.classList.remove('dragging');
                    col.style.opacity = '1';
                });
                
                let startY = 0, isDragging = false, dragMoved = false;
                let holdTimer = null, holdTarget = null, holdInterval = null;
                
                col.onpointerdown = (e) => { 
                    startY = e.clientY; 
                    isDragging = true; 
                    dragMoved = false;
                    col.setPointerCapture(e.pointerId); 
                    const topCard = col.querySelector('.guide-card[data-depth="0"]');
                    if (topCard) topCard.style.transition = 'none';
                    
                    holdTarget = e.target.closest('.guide-card');
                    if (holdTarget && holdTarget.dataset.depth === "0") {
                        holdTimer = setTimeout(() => {
                            if (!dragMoved && holdTarget) {
                                holdTarget.classList.add('selected-card');
                                const actionName = holdTarget.querySelector('.card-title').textContent;
                                holdInterval = setInterval(() => {
                                    holdTarget.classList.add('launching');
                                    emitAction(actionName, holdTarget);
                                    setTimeout(() => holdTarget.classList.remove('launching'), 450);
                                }, 300);
                            }
                        }, 300);
                    }
                };
                
                col.onpointermove = (e) => { 
                    if(!isDragging) return; 
                    const deltaY = e.clientY - startY; 
                    // Interaction Fix: Increased threshold from 5 to 15 to prevent trackpad jitters from cancelling clicks
                    if (Math.abs(deltaY) > 15) {
                        dragMoved = true;
                        clearTimeout(holdTimer);
                        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; if (holdTarget) holdTarget.classList.remove('selected-card'); }
                    }
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
                    
                    clearTimeout(holdTimer);
                    if (holdInterval) { 
                        clearInterval(holdInterval); 
                        holdInterval = null; 
                        if (holdTarget) holdTarget.classList.remove('selected-card'); 
                        return; // We already fired actions via hold, do not fire single click
                        return;
                    }

                    const topCard = col.querySelector('.guide-card[data-depth="0"]');
                    if (topCard) {
                        topCard.style.transition = '';
                        topCard.style.transform = '';
                    }
                    
                    if (!dragMoved) {
                        const clickedCard = holdTarget;
                        let firedViaSuperimposed = false;

                        // Interaction Bug Fix: If the keyboard selector is active and the user clicks the 
                        // superimposed card, instantly fire it instead of relying on double click.
                        // (Otherwise the card shrinks and teleports away, causing the second click to miss)
                        if (typeof isKeyboardSelectorActive !== 'undefined' && isKeyboardSelectorActive) {
                            if (clickedCard && clickedCard.dataset.depth === "0" && clickedCard.parentElement === col && clickedCard.classList.contains('superimposed-card')) {
                                firedViaSuperimposed = true;
                                clickedCard.classList.remove('selected-card');
                                clickedCard.classList.add('launching');
                                const actionName = clickedCard.querySelector('.card-title').textContent;
                                emitAction(actionName, clickedCard);
                                setTimeout(() => { 
                                    clickedCard.classList.remove('launching'); 
                                    clickedCard.remove();
                                    
                                    const remainingCards = Array.from(col.querySelectorAll('.guide-card'));
                                    if (remainingCards.length === 0) {
                                        col.style.width = '0px';
                                        col.style.flex = '0 0 0px';
                                        col.style.marginRight = '0px';
                                        col.style.opacity = '0';
                                        setTimeout(() => { col.style.display = 'none'; syncPanelWidth(); }, 300);
                                    } else {
                                        remainingCards.forEach((c, i) => {
                                            c.dataset.depth = i.toString();
                                        });
                                        syncPanelWidth();
                                    }
                                }, 450);
                            }
                            toggleKeyboardSelector();
                        }
                        
                        // Single / Double click activation
                        if (!firedViaSuperimposed && clickedCard && clickedCard.parentElement === col) {
                            setFocus(idx);
                            if(clickedCard.dataset.depth === "0") {
                                const now = performance.now();
                                const isRapidDoubleClick = clickedCard.dataset.lastClick && (now - parseFloat(clickedCard.dataset.lastClick)) < 400;
                                const isAlreadySelected = clickedCard.classList.contains('selected-card');
                                
                                if (isRapidDoubleClick || isAlreadySelected) {
                                    // DOUBLE CLICK OR CLICK ON SELECTED - FIRE!
                                    clickedCard.dataset.lastClick = 0;
                                    clickedCard.classList.remove('selected-card');
                                    clickedCard.classList.add('launching');
                                    const actionName = clickedCard.querySelector('.card-title').textContent;
                                    emitAction(actionName, clickedCard);
                                    setTimeout(() => { 
                                        clickedCard.classList.remove('launching'); 
                                        clickedCard.remove();
                                        
                                        const remainingCards = Array.from(col.querySelectorAll('.guide-card'));
                                        if (remainingCards.length === 0) {
                                            col.style.width = '0px';
                                            col.style.flex = '0 0 0px';
                                            col.style.marginRight = '0px';
                                            col.style.opacity = '0';
                                            setTimeout(() => { col.style.display = 'none'; syncPanelWidth(); }, 300);
                                        } else {
                                            remainingCards.forEach((c, i) => {
                                                c.dataset.depth = i.toString();
                                            });
                                            syncPanelWidth();
                                        }
                                    }, 450);
                                } else {
                                    // SINGLE CLICK - SELECT ONLY (No Modal)
                                    clickedCard.dataset.lastClick = now;
                                    document.querySelectorAll('.guide-card.selected-card').forEach(c => c.classList.remove('selected-card'));
                                    clickedCard.classList.add('selected-card');
                                }
                            }
                        }
                    }
                };
                col.onpointerup = endDrag;
                col.onpointercancel = endDrag;

                cat.cards.forEach((name, i) => {
                    const card = document.createElement('div');
                    card.className = `guide-card card-${cat.id.toLowerCase()}${cat.isItem ? ' card-item' : ''}`;
                    card.dataset.depth = i;
                    if (cat.qty !== undefined) card.dataset.qty = cat.qty;
                    
                    const cardDef = window.MasterCardDatabase && window.MasterCardDatabase.CardDefinitions ? window.MasterCardDatabase.CardDefinitions[name] : null;
                    const displayAttr = (cardDef && cardDef.attr) ? cardDef.attr : cat.attr;
                    const badgeHtml = cat.qty !== undefined ? `<div class="card-badge">${cat.qty}</div>` : '';
                    card.innerHTML = `
                        <div class="card-header"><span class="card-kanji">${cat.kanji || ''}</span><span class="card-type-pill">${cat.isItem ? 'ITEM' : cat.id}</span></div>
                        <div class="card-title">${name}</div><div class="card-desc">${cat.desc}</div>
                        <div class="card-icon-3d" data-element="${cat.icon3d || cat.id}"><canvas></canvas></div>
                        <div class="card-attr-fused">${displayAttr || ''}</div>
                        <div class="card-click-overlay"></div>
                        ${badgeHtml}
                    `;
                    col.appendChild(card);
                });
                container.appendChild(col);
            });
            
            // Drag and Drop Container Logic
            container.addEventListener('dragover', e => {
                e.preventDefault();
                const draggingCol = container.querySelector('.dragging');
                if (!draggingCol) return;
                
                const afterElement = getDragAfterElement(container, e.clientX);
                if (afterElement == null) {
                    container.appendChild(draggingCol);
                } else {
                    container.insertBefore(draggingCol, afterElement);
                }
            });

            setFocus(0, false);
            
            // Re-attach hover focus states to newly generated UI
            document.querySelectorAll('.u-panel').forEach(p => { 
                p.onmouseenter = () => p.focus(); 
                p.onmouseleave = () => p.blur(); 
            });
            
            // Ensure 3D icons are rendered for the newly built deck
            if (typeof init3DIcons === 'function') init3DIcons();
            
            // Initial sync of exact card width
            syncPanelWidth();
        }
        
        // Dynamically update CSS variable so input fields perfectly match the EXACT width of VISIBLE cards
        function syncPanelWidth() {
            let visibleCount = 0;
            document.querySelectorAll('.card-column').forEach(col => {
                if (window.getComputedStyle(col).display !== 'none') {
                    visibleCount++;
                }
            });
            if (visibleCount > 0) {
                document.documentElement.style.setProperty('--num-cards', visibleCount);
            }
        }
        
        function getDragAfterElement(container, x) {
            const draggableElements = [...container.querySelectorAll('.card-column:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = x - box.left - box.width / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        document.getElementById('launch-btn').onclick = function(e) { 
            e.preventDefault();
            emitAction(pendingAction, this); 
            closeModal(); 
            
            if (activeCardElement) {
                activeCardElement.classList.remove('selected-card');
                activeCardElement.classList.add('launching');
                const col = activeCardElement.closest('.card-column');
                setTimeout(() => { 
                    activeCardElement.classList.remove('launching'); 
                    activeCardElement.remove();
                    if (col) {
                        const remainingCards = Array.from(col.querySelectorAll('.guide-card'));
                        if (remainingCards.length === 0) {
                            col.style.width = '0px';
                            col.style.flex = '0 0 0px';
                            col.style.marginRight = '0px';
                            col.style.opacity = '0';
                            setTimeout(() => { col.style.display = 'none'; syncPanelWidth(); }, 300);
                        } else {
                            remainingCards.forEach((c, idx) => c.dataset.depth = idx);
                            syncPanelWidth();
                        }
                    }
                    activeCardElement = null;
                }, 450);
            }
        };
        
        function toggleSidePanel(id, arrowId, isLeft) {
            const el = document.getElementById(id);
            const btn = document.getElementById(arrowId);
            el.classList.toggle('minimized');
            if (el.classList.contains('minimized')) {
                btn.innerHTML = isLeft ? '&gt;' : '&lt;';
            } else {
                btn.innerHTML = isLeft ? '&lt;' : '&gt;';
            }
        }
        
        function toggleEventLog() {
            const el = document.getElementById('event-log-container');
            el.classList.toggle('active');
        }

        // INIT AND EVENTS PANEL LOGIC ---
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
        
        const activeDPadPointers = new Map();
        const handleDPadInput = (e, isDown) => {
            if (e.cancelable) e.preventDefault();
            if (isDown) {
                const btn = e.target.closest('[data-key]');
                if (!btn) return;
                const key = btn.dataset.key;
                activeDPadPointers.set(e.pointerId, key);
                playAvatarAnim('walk');
                window.parent.postMessage({ type: 'KEY_DOWN', key: key, code: key }, '*');
            } else {
                const key = activeDPadPointers.get(e.pointerId);
                if (!key) return; // Ignores pointerup/leave if this pointer didn't press a button
                playAvatarAnim('idle');
                window.parent.postMessage({ type: 'KEY_UP', key: key, code: key }, '*');
                activeDPadPointers.delete(e.pointerId);
            }
        };

        const leftPanel = document.getElementById('left-panel');
        // Use pointer events instead to unify touch/mouse and avoid sticky keys
        leftPanel.addEventListener('pointerdown', e => handleDPadInput(e, true));
        leftPanel.addEventListener('pointerup', e => handleDPadInput(e, false));
        leftPanel.addEventListener('pointerleave', e => handleDPadInput(e, false));
        leftPanel.addEventListener('pointercancel', e => handleDPadInput(e, false));

        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        if (mode === 'combat') {
            document.getElementById('lower-ui-row').style.display = 'none';
            document.body.classList.remove('focus-active');
        } else if (mode === 'dock') {
            document.getElementById('encounter-zone').style.display = 'none';
        }
        
        // Hide action buttons on mobile by default
        if (window.innerWidth <= 768) {
            const az = document.getElementById('action-zone');
            if (az) az.classList.remove('outer-active');
        }

        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (isKeyboardSelectorActive) {
                    toggleKeyboardSelector();
                    return;
                }
                closeModal(); 
                if(document.activeElement.classList.contains('u-panel')) document.activeElement.blur(); 
                return; 
            }
            if (e.key === 'Tab') return;
            
            if (e.key === 'Enter' && !exitModalActive && !document.activeElement.classList.contains('chat-input')) {
                e.preventDefault();
                if (isKeyboardSelectorActive) {
                    const topCard = document.querySelector(`#col-${focusedColIndex} .guide-card[data-depth="0"]`);
                    if(topCard) {
                        // Rapid Fire: 2nd Enter immediately fires the card
                        const name = topCard.querySelector('.card-title').textContent;
                        document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                        topCard.classList.remove('selected-card');
                        topCard.classList.add('launching');
                        emitAction(name, topCard);
                        
                        // Handle DOM removal and stack depth updates
                        const col = topCard.parentElement;
                        setTimeout(() => { 
                            topCard.classList.remove('launching'); 
                            topCard.remove();
                            
                            if (col) {
                                const remainingCards = Array.from(col.querySelectorAll('.guide-card'));
                                if (remainingCards.length === 0) {
                                    col.style.width = '0px';
                                    col.style.flex = '0 0 0px';
                                    col.style.marginRight = '0px';
                                    col.style.opacity = '0';
                                    setTimeout(() => { 
                                        col.style.display = 'none'; 
                                        syncPanelWidth(); 
                                        
                                        // If this column is empty, shift focus to the nearest available column
                                        if (isKeyboardSelectorActive) {
                                            focusedColIndex = Math.max(0, Math.min(categories.length - 1, focusedColIndex - 1));
                                            setFocus(focusedColIndex);
                                            updateSuperimposedCard();
                                        }
                                    }, 300);
                                } else {
                                    remainingCards.forEach((c, i) => {
                                        c.dataset.depth = i.toString();
                                    });
                                    syncPanelWidth();
                                    if (isKeyboardSelectorActive) updateSuperimposedCard();
                                }
                            }
                        }, 400);
                        
                        // Do NOT toggle out of selector mode here, allowing true rapid-fire with just Enter!
                    }
                } else {
                    // 1st Enter: Enter selector mode
                    toggleKeyboardSelector();
                }
                return;
            }
            
            // Intercept Deck Navigation
            if (isKeyboardSelectorActive || document.activeElement.id === 'bottom-panel') {
                if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    focusedColIndex = e.key === 'ArrowLeft' ? Math.max(0, focusedColIndex - 1) : Math.min(categories.length - 1, focusedColIndex + 1);
                    setFocus(focusedColIndex);
                    document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                    if (isKeyboardSelectorActive) updateSuperimposedCard();
                    
                    const topCard = document.querySelector(`#col-${focusedColIndex} .guide-card[data-depth="0"]`);
                    if(topCard && !isKeyboardSelectorActive) {
                        const tt = topCard.querySelector('.card-tooltip');
                        if(tt) tt.classList.add('show');
                    }
                    return; // Prevent FPV movement
                } else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault();
                    document.querySelectorAll('.card-tooltip').forEach(t => t.classList.remove('show'));
                    cycle(focusedColIndex, e.key === 'ArrowDown');
                    return; // Prevent FPV movement
                }
            }
            
            if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key) && !document.activeElement.classList.contains('chat-input') && document.activeElement.id !== 'bottom-panel') {
                playAvatarAnim('walk');
            }
            if (!document.activeElement.classList.contains('chat-input')) {
                window.parent.postMessage({ type: 'KEY_DOWN', key: e.key, code: e.code }, '*');
            }
        });
        window.addEventListener('keyup', e => {
            if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                playAvatarAnim('idle');
            }
            window.parent.postMessage({ type: 'KEY_UP', key: e.key, code: e.code }, '*');
        });
        
        window.addEventListener('blur', () => {
            // Failsafe: if the browser or iframe loses focus, flush all movement keys
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].forEach(k => {
                window.parent.postMessage({ type: 'KEY_UP', key: k, code: k }, '*');
            });
            playAvatarAnim('idle');
            activeDPadPointers.clear();
        });
        setup();

        const centerDiceBtn = document.querySelector('.kp-center-btn');
        if (centerDiceBtn) {
            centerDiceBtn.addEventListener('click', () => {
                window.diceAttackSpin = 40.0;
                const roll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2; // 2d6
                window.parent.postMessage({ type: 'COMBAT_DAMAGE_MODIFIER', value: roll }, '*');
                console.log(`[Tactical UI] Dice Clicked - Rolling 2d6 Modifier: ${roll}`);
            });
        }

        // --- Compass Direction Dial Update ---
        // Called in real-time (~20hz) by PLAYER_ROT_REALTIME and on grid change by PLAYER_MOVE.
        function updateCompass(rot) {
            const compass = document.querySelector('.compass-outer-ring');
            if (!compass) return;
            const rotDeg = (rot * 180) / Math.PI;
            compass.style.transform = `rotate(${rotDeg}deg)`;
            
            // Calculate which direction is at the top (under the glass indicator)
            let angle = rotDeg % 360;
            if (angle < 0) angle += 360; // Normalize to 0-360
            
            const isN = (angle >= 330 || angle <= 30);
            const isW = (angle >= 60 && angle <= 120);
            const isS = (angle >= 150 && angle <= 210);
            const isE = (angle >= 240 && angle <= 300);

            const n = compass.querySelector('.north');
            if (n) {
                n.style.transform = `translateX(-50%) rotate(${-rotDeg}deg)`;
                n.classList.toggle('active-dir', isN);
            }
            const s = compass.querySelector('.south');
            if (s) {
                s.style.transform = `translateX(-50%) rotate(${-rotDeg}deg)`;
                s.classList.toggle('active-dir', isS);
            }
            const e_marker = compass.querySelector('.east');
            if (e_marker) {
                e_marker.style.transform = `translateY(-50%) rotate(${-rotDeg}deg)`;
                e_marker.classList.toggle('active-dir', isE);
            }
            const w = compass.querySelector('.west');
            if (w) {
                w.style.transform = `translateY(-50%) rotate(${-rotDeg}deg)`;
                w.classList.toggle('active-dir', isW);
            }
        }

        // Listen for combat state changes from main relay
        window.addEventListener('message', (e) => {

            if (e.data && e.data.type === 'SHOW_COMBAT') {
                const ez = document.getElementById('encounter-zone');
                if (!ez.classList.contains('active')) {
                    window.logEvent('You encounter a Yakuza Goblin!', 'system');
                    window.logEvent('DMG: (LVL + WPN + SPC)', 'system');
                }
                ez.classList.add('active');
                document.getElementById('event-log-container').classList.add('active');
                if (e.data.health !== undefined) {
                    const hp = Math.max(0, Math.round(e.data.health));
                    const maxHp = e.data.maxHp || 50;
                    const mnum = document.getElementById('monster-hp-num');
                    if (mnum) mnum.textContent = hp;
                    const mfill = document.getElementById('monster-hp-fill');
                    if (mfill) mfill.style.width = Math.max(0, (hp / maxHp) * 100) + '%';
                    // Update the max HP label
                    const mmax = document.getElementById('monster-hp-max');
                    if (mmax) mmax.textContent = `/ ${maxHp} HP`;
                    // Colour-shift bar as HP drops
                    if (mfill) {
                        if (hp <= 10) mfill.style.background = 'linear-gradient(90deg,#4a0000,#ff0000)';
                        else if (hp <= 25) mfill.style.background = 'linear-gradient(90deg,#b71c1c,#ff5252)';
                        else mfill.style.background = '';
                    }
                }
                // Update monster name from actual model userData
                if (e.data.name) {
                    const mname = document.getElementById('monster-name');
                    if (mname) mname.textContent = e.data.name;
                }
                // Update type label (ENEMY / GAMBLER)
                if (e.data.entityType) {
                    const mlabel = document.getElementById('monster-type-label');
                    if (mlabel) {
                        const typeStr = e.data.entityType === 'gambler' ? 'GAMBLER' : 'ENEMY';
                        const distEl = mlabel.querySelector('.dist-text');
                        const distStr = distEl ? distEl.outerHTML : '<span class="dist-text">-- ft</span>';
                        mlabel.innerHTML = `${typeStr} * ${distStr}`;
                    }
                }
                if (e.data.distance !== undefined) {
                    const distTexts = document.querySelectorAll('.dist-text');
                    // Center-to-center distance * 10, minus 10 feet for physical contact radius
                    let distFeet = Math.max(0, (e.data.distance * 10) - 10).toFixed(0);
                    distTexts.forEach(el => el.textContent = `${distFeet} ft`);
                }
            } else if (e.data && e.data.type === 'COMBAT_STATE_UPDATE') {
                const indicator = document.getElementById('turn-indicator');
                if (indicator) {
                    if (e.data.state === 'idle') {
                        indicator.style.display = 'none';
                        indicator.className = '';
                    } else if (e.data.state === 'player_turn') {
                        indicator.style.display = 'block';
                        indicator.className = 'player-turn';
                        indicator.textContent = 'PLAYER TURN';
                    } else if (e.data.state === 'monster_turn') {
                        indicator.style.display = 'block';
                        indicator.className = 'monster-turn';
                        indicator.textContent = 'ENEMY TURN';
                    }
                }
            } else if (e.data && e.data.type === 'SYNC_UI' && e.data.event === 'MONSTER_DEATH') {
                const ez = document.getElementById('encounter-zone');
                if (ez) {
                    ez.classList.remove('active');
                }
            } else if (e.data && e.data.type === 'UPDATE_LOOT_CARDS') {
                const layer = document.getElementById('floating-loot-layer');
                if (!layer) return;
                
                // Track alive elements to handle despawning
                Array.from(layer.children).forEach(c => c.dataset.alive = "0");
                
                e.data.items.forEach(item => {
                    let card = document.getElementById('loot-c-' + item.id);
                    if (!card) {
                        card = document.createElement('div');
                        card.id = 'loot-c-' + item.id;
                        
                        const cat = defaultCategories.find(c => c.cards.includes(item.cardName)) || defaultCategories[0];
                        card.className = `guide-card card-${cat.id.toLowerCase()}${cat.isItem ? ' card-item' : ''}`;
                        card.dataset.depth = "0";
                        card.style.position = 'absolute';
                        card.style.width = 'var(--card-w)'; // Force card size to match normal cards
                        card.style.height = 'var(--card-h)';
                        card.style.pointerEvents = 'auto'; // Re-enable pointer events since parent is none
                        card.style.cursor = 'pointer';
                        
                        // Matches generateCardHTML layout pixel-perfectly
                        card.innerHTML = `
                            <div class="card-header"><span class="card-kanji">${cat.kanji || ''}</span><div class="card-type-pill">${cat.isItem ? 'ITEM' : cat.id}</div></div>
                            <h3 class="card-title loot-card-title">${item.cardName}</h3><p class="card-desc loot-card-desc">${cat.desc}</p>
                            <div class="card-icon-3d" data-element="${cat.icon3d || cat.id}"><canvas></canvas></div>
                            <div class="card-attr-fused">${cat.attr || ''}</div>
                        `;
                        
                        // Click to activate the 3D card remotely
                        card.onclick = (e) => {
                            e.stopPropagation();
                            card.classList.add('launching');
                            
                            // Show card in PIP
                            const pipOverlay = document.createElement('img');
                            pipOverlay.src = item.dataURL;
                            pipOverlay.className = 'pip-overlay-anim';
                            const moondial = document.getElementById('moondial-wrapper');
                            if (moondial) moondial.appendChild(pipOverlay);
                            
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    pipOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
                                    pipOverlay.style.opacity = '1';
                                });
                            });
                            
                            setTimeout(() => {
                                pipOverlay.style.transform = 'translate(-50%, -50%) scale(1.5)';
                                pipOverlay.style.opacity = '0';
                                setTimeout(() => pipOverlay.remove(), 400);
                            }, 800);

                            setTimeout(() => {
                                card.classList.remove('launching');
                                if (window.emitAction) window.emitAction(item.cardName, card);
                            }, 420);
                        };

                        layer.appendChild(card);
                        // Trigger cache rescan for new canvas
                        window.canvasCache = window.canvasCache || {};
                        window.canvasCache.lastScan = 0;
                    }
                    card.dataset.alive = "1";
                    
                    if (!item.visible) {
                        card.style.display = 'none';
                    } else {
                        card.style.display = 'flex';
                        // Float bottom-center anchored
                        card.style.transform = `translate(-50%, -85%) scale(${item.scale})`;
                        card.style.left = item.left + 'px';
                        card.style.top = item.top + 'px';
                        card.style.zIndex = Math.floor(item.scale * 100);
                        card.style.opacity = Math.min(1.0, item.scale * 1.5).toString();
                    }
                });
                
                // Cleanup collected/despawned
                Array.from(layer.children).forEach(c => {
                    if (c.dataset.alive === "0") c.remove();
                });
            } else if (e.data && (e.data.type === 'HIDE_COMBAT' || e.data.type === 'HIDE_ALL')) {
                document.getElementById('encounter-zone').classList.remove('active');
                if (document.activeElement !== document.querySelector('.chat-input')) {
                    document.getElementById('event-log-container').classList.remove('active');
                }
                loadDeck(defaultCategories); // Reset deck after combat
            } else if (e.data && e.data.type === 'COMBAT_ATTACK') {
                window.diceAttackSpin = 40.0; // Overdrive the dice icon spin!
                // Player uses Empty Hand (bump attack) - Deck must be organically looted!
                if (avatarActions && avatarActions.slash) {
                    const slash = avatarActions.slash;
                    slash.reset();
                    slash.setLoop(THREE.LoopOnce, 1);
                    slash.clampWhenFinished = true;
                    // Safely fade out old action to prevent crossFade NULL errors
                    if (avatarCurrentAction && avatarCurrentAction.isRunning()) {
                        avatarCurrentAction.fadeOut(0.2);
                    }
                    slash.fadeIn(0.2).play();
                    avatarCurrentAction = slash;
                    
                    // Return to idle/walk after animation finishes (~1sec)
                    setTimeout(() => {
                        const nextAction = document.body.classList.contains('is-moving') ? avatarActions.walk : avatarIdleAction;
                        if (nextAction && nextAction !== avatarCurrentAction) {
                            nextAction.reset();
                            if (avatarCurrentAction) avatarCurrentAction.fadeOut(0.3);
                            nextAction.fadeIn(0.3).play();
                            avatarCurrentAction = nextAction;
                        }
                    }, Math.max(1000, (slash.getClip().duration * 1000) - 200));
                }
            } else if (e.data && e.data.type === 'SYNC_STATS') {
                const php = document.getElementById('player-hp-val');
                const pgold = document.getElementById('player-gold-val');
                const lvlBadge = document.querySelector('.level-badge');
                
                if (php) {
                    php.textContent = e.data.hp;
                    if (e.data.hp <= 20) php.parentElement.style.color = '#ff5252';
                    else php.parentElement.style.color = '#00ffcc';
                }
                if (pgold) pgold.textContent = e.data.gold;
                window.playerGold = e.data.gold;
                if (lvlBadge && e.data.playerLevel) lvlBadge.textContent = e.data.playerLevel;
                
                // Set health donut variable
                const avatarCircle = document.querySelector('.avatar-circle');
                if (avatarCircle && e.data.maxHp) {
                    const hpPct = Math.max(0, Math.min(100, (e.data.hp / e.data.maxHp) * 100));
                    avatarCircle.style.setProperty('--hp-pct', `${hpPct}%`);
                }
                
                // Attributes
                ['str','dex','con','int','wis','cha'].forEach(a => {
                    const el = document.getElementById(`attr-${a}`);
                    if (el && e.data[a]) el.textContent = e.data[a];
                });
                
                const pxp = document.getElementById('player-xp-val');
                if (pxp && e.data.xp !== undefined) pxp.textContent = e.data.xp;
                const pxpMax = document.getElementById('player-xp-max');
                if (pxpMax && e.data.maxXp) pxpMax.textContent = e.data.maxXp;
                const phb = document.getElementById('player-hp-max');
                if (phb && e.data.maxHp) phb.textContent = `/ ${e.data.maxHp} HP`;
                
                const pfill = document.getElementById('player-hp-fill');
                const hp = Math.max(0, Math.round(e.data.hp));
                if (pfill && e.data.maxHp) pfill.style.width = Math.max(0, (hp / e.data.maxHp) * 100) + '%';
                // Colour-shift as HP drops
                if (pfill) {
                    if (hp <= 20) pfill.style.background = 'linear-gradient(90deg,#4a0000,#ff1111)';
                    else if (hp <= 50) pfill.style.background = 'linear-gradient(90deg,#b71c1c,#ff7043)';
                    else pfill.style.background = '';
                }
            } else if (e.data && e.data.type === 'LOOT_CARDS') {
                window.logEvent('LOOT AQUIRED: Tactical Katana Deck', 'system');
                loadDeck(combatCategories);
            } else if (e.data && e.data.type === 'ADD_CARD') {
                const cardName = e.data.card;
                if (!window.cardInventoryCounts) window.cardInventoryCounts = {};
                window.cardInventoryCounts[cardName] = (window.cardInventoryCounts[cardName] || 1) + 1;
                
                const count = window.cardInventoryCounts[cardName];
                if (count >= 2) {
                    // Update all visual representations of this card
                    document.querySelectorAll('.guide-card').forEach(card => {
                        const titleEl = card.querySelector('.card-title');
                        if (titleEl && titleEl.textContent === cardName) {
                            let badge = card.querySelector('.card-badge');
                            if (!badge) {
                                badge = document.createElement('div');
                                badge.className = 'card-badge';
                                card.appendChild(badge);
                            }
                            badge.textContent = count;
                            card.dataset.qty = count;
                        }
                    });
                }
                
                // If inventory is open, refresh it
                const invModal = document.getElementById('inventory-modal');
                if (invModal && invModal.classList.contains('active')) {
                    window.renderInventory();
                }
            } else if (e.data && e.data.type === 'LCD_EVENT') {
                if (window.showLcdEvent) window.showLcdEvent(e.data.text || "SYS_ERR");
                window.logEvent(e.data.text || "SYS_ERR", 'system');
            } else if (e.data && e.data.type === 'LOG_EVENT') {
                window.logEvent(e.data.text, e.data.logType || 'system');
            } else if (e.data && e.data.type === 'PLAYER_MOVE') {
                if (e.data.rot !== undefined) updateCompass(e.data.rot);
            } else if (e.data && e.data.type === 'PLAYER_ROT_REALTIME') {
                // Real-time rotation update (broadcasted ~20hz from FPV engine)
                if (e.data.rot !== undefined) updateCompass(e.data.rot);
            } else if (e.data && e.data.type === 'RADAR_UPDATE') {
                if (e.data.rot !== undefined) updateCompass(e.data.rot);
                const radarOverlay = document.getElementById('radar-overlay');
                if (radarOverlay && e.data.enemies) {
                    // Reuse DOM elements instead of trashing layout 20x a second
                    const existingBlips = radarOverlay.children;
                    const maxDist = 15.0;
                    // Cache width/height outside the loop to prevent layout thrashing!
                    const halfW = radarOverlay.offsetWidth / 2;
                    const halfH = radarOverlay.offsetHeight / 2;
                    
                    for (let i = 0; i < e.data.enemies.length; i++) {
                        const en = e.data.enemies[i];
                        const cosR = Math.cos(e.data.rot);
                        const sinR = Math.sin(e.data.rot);
                        
                        const localX = en.dx * cosR - en.dz * sinR;
                        const localZ = en.dx * sinR + en.dz * cosR;
                        
                        const pctX = (localX / maxDist) * 50;
                        const pctY = (localZ / maxDist) * 50;
                        
                        let blip = existingBlips[i];
                        if (!blip) {
                            blip = document.createElement('div');
                            blip.className = 'radar-blip';
                            radarOverlay.appendChild(blip);
                        }
                        
                        // Use CSS transform for hardware acceleration instead of left/top!
                        const pxX = (pctX / 50) * halfW;
                        const pxY = (pctY / 50) * halfH;
                        blip.style.transform = `translate(${pxX}px, ${pxY}px)`;
                        blip.style.display = 'block';
                    }
                    
                    // Hide any extra blips
                    for (let i = e.data.enemies.length; i < existingBlips.length; i++) {
                        existingBlips[i].style.display = 'none';
                    }
                }
            } else if (e.data && e.data.type === 'PLAYER_MOVE_STATE') {
                if (e.data.isMoving) {
                    document.body.classList.add('is-moving');
                    hideExitModal(); // Hide if player walks away
                    
                    // Fade event log if we start moving and aren't actively typing
                    const logContainer = document.getElementById('event-log-container');
                    const ez = document.getElementById('encounter-zone');
                    if (document.activeElement !== document.querySelector('.chat-input') && !ez.classList.contains('active')) {
                        logContainer.classList.add('faded');
                    }
                    
                    const walk = avatarActions ? avatarActions.walk : null;
                    if (walk && avatarCurrentAction !== walk) {
                        walk.reset();
                        walk.setEffectiveTimeScale(1.0);
                        if (avatarCurrentAction) walk.crossFadeFrom(avatarCurrentAction, 0.3, true);
                        walk.play();
                        avatarCurrentAction = walk;
                    }
                }
                else {
                    document.body.classList.remove('is-moving');
                    if (avatarIdleAction && avatarCurrentAction !== avatarIdleAction) {
                        avatarIdleAction.reset();
                        const isWalkCycle = (avatarActions && avatarIdleAction === avatarActions.walk);
                        avatarIdleAction.setEffectiveTimeScale(isWalkCycle ? 0.05 : 1.0);
                        if (avatarCurrentAction) avatarIdleAction.crossFadeFrom(avatarCurrentAction, 0.3, true);
                        avatarIdleAction.play();
                        avatarCurrentAction = avatarIdleAction;
                    } else if (!avatarIdleAction && avatarCurrentAction) {
                        // Return to T-pose/idle freeze if no logical idle clip exists
                        avatarCurrentAction.fadeOut(0.3);
                        setTimeout(() => { if (avatarCurrentAction && avatarCurrentAction.getEffectiveWeight() === 0) avatarCurrentAction.stop(); avatarCurrentAction = null; }, 300);
                    }
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
            
            // Recalculate dynamic width whenever viewport bounds change Media Queries
            syncPanelWidth();
        }
        window.addEventListener('resize', updateViewportReadout);
        
        // Log System & Chat Input bindings
        window.logEvent = function(text, type = 'system') {
            const container = document.getElementById('event-log-container');
            if (!container) return;
            
            // Wake up container
            container.classList.remove('faded');
            if (window.logFadeTimeout) clearTimeout(window.logFadeTimeout);
            
            // Auto open panel for chat or critical damage dialogue so the user can actually see it!
            if (type === 'chat' || type === 'damage') {
                container.classList.add('active');
            }
            
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            
            let formattedText = text;
            if (type === 'chat' && !formattedText.includes('"')) {
                formattedText = `"${formattedText}"`;
            }
            entry.innerHTML = formattedText;
            container.appendChild(entry);
            // Cap history
            while (container.childNodes.length > 50) container.removeChild(container.firstChild);
            container.scrollTop = container.scrollHeight;
            
            // Start fade out timer (5 seconds)
            window.logFadeTimeout = setTimeout(() => {
                if (document.activeElement !== document.querySelector('.chat-input')) {
                    container.classList.add('faded');
                }
            }, 5000);
        };

        const chatInput = document.querySelector('.chat-input');
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                const container = document.getElementById('event-log-container');
                container.classList.add('active');
                container.classList.remove('faded');
                if (window.logFadeTimeout) clearTimeout(window.logFadeTimeout);
            });
            chatInput.addEventListener('blur', () => {
                if (window.logFadeTimeout) clearTimeout(window.logFadeTimeout);
                // Delay collapse slightly to allow interaction (like clicking a log button). Only collapse if not in combat.
                window.logFadeTimeout = setTimeout(() => {
                    const ez = document.getElementById('encounter-zone');
                    if (!ez.classList.contains('active')) {
                        document.getElementById('event-log-container').classList.add('faded');
                        document.getElementById('event-log-container').classList.remove('active');
                    }
                }, 150);
            });
        }

        setTimeout(() => {
            updateViewportReadout();
            if (window.clampPiPIntoViewport) window.clampPiPIntoViewport();
            if (window.syncRect) window.syncRect();
            if (window.innerWidth >= 1024) {
                const az = document.getElementById('action-zone');
                if (az && !az.classList.contains('outer-active')) az.classList.add('outer-active');
            }
        }, 100); // Initial call after DOM paints
        updateViewportReadout();
    