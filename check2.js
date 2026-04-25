            document.addEventListener('DOMContentLoaded', () => {
                const pipCanvas = document.getElementById('pipCanvas');
                if (pipCanvas) {
                    pipCanvas.addEventListener('click', () => {
                        window.parent.postMessage({ type: 'PIP_TOGGLE' }, '*');
                    });
                    pipCanvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        window.parent.postMessage({ type: 'PIP_ZOOM', delta: Math.sign(e.deltaY) }, '*');
                    }, { passive: false });
                }

                // Moonphase calculation based on current Date
                function getMoonPhase() {
                    const today = new Date();
                    let year = today.getFullYear();
                    let month = today.getMonth() + 1;
                    let day = today.getDate();
                    if (month < 3) { year--; month += 12; }
                    month++;
                    const c = 365.25 * year;
                    const e = 30.6 * month;
                    let jd = c + e + day - 694039.09;
                    jd /= 29.5305882;
                    const b = Math.floor(jd);
                    jd -= b;
                    let phase = Math.round(jd * 8);
                    if (phase >= 8) phase = 0;
                    return phase;
                }
                
                const phase = getMoonPhase(); // 0 to 7
                const phaseNames = ['NEW MOON PHASE', 'WAXING CRESCENT MOON PHASE', 'FIRST QUARTER MOON PHASE', 'WAXING GIBBOUS MOON PHASE', 'FULL MOON PHASE', 'WANING GIBBOUS MOON PHASE', 'LAST QUARTER MOON PHASE', 'WANING CRESCENT MOON PHASE'];
                window.parent.postMessage({ type: 'MOON_PHASE', phase: phaseNames[phase] }, '*');

                const ring = document.querySelector('.season-outer-ring');
                if (ring) {
                    const rotation = -(phase * 45);
                    ring.style.transform = `rotate(${rotation}deg)`;
                }
            });
        </script>
<script>
    (function() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        // Only run PiP in Dock mode (the bottom full-screen iframe)
        if (mode !== 'dock') return;

        const pip = document.getElementById("moondial-wrapper");
        if (!pip) return;
        pip.style.display = 'block';

        const MIN_W = 200, MIN_H = 200;
        let dragging = false, mapRotating = false, mapPanning = false;
        let dragStart = { x: 0, y: 0, left: 0, top: 0 };
        let rotStart = { x: 0, y: 0 };
        let panStart = { x: 0, y: 0 };

        // Post to master router
        function post(msg) { window.parent.postMessage(msg, '*'); }

        function syncRect() {
            const wrapper = document.getElementById('pipCanvas');
            if (wrapper) {
                const r = wrapper.getBoundingClientRect();
                post({ type: 'PIP_SYNC_RECT', width: r.width, height: r.height, left: r.left, top: r.top, bottom: r.bottom });
            }
        }
        window.syncRect = syncRect;

        // Prevent context menu
        pip.addEventListener("contextmenu", e => { 
            if (e.target.closest("#pipCanvas") || e.target === pip) e.preventDefault(); 
        });
        
        // Zoom via scroll wheel
        pip.addEventListener("wheel", (e) => {
            if (e.target.closest("#pipCanvas")) {
                e.preventDefault();
                post({ type: 'PIP_ZOOM', delta: Math.sign(e.deltaY) });
            }
        }, { passive: false });

        // Double-click to swap modes
        pip.addEventListener("dblclick", (e) => {
             e.stopPropagation();
             if (e.target.closest("#pipCanvas") || e.target === pip) {
                 post({ type: 'PIP_TOGGLE' });
             }
        });
        
        pip.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            
            if (e.button === 2) { 
                 e.preventDefault();
                 mapRotating = true; rotStart.x = e.clientX; rotStart.y = e.clientY;
                 document.addEventListener("mousemove", onRotMove);
                 document.addEventListener("mouseup", onRotEnd, { once: true });
                 document.addEventListener("mouseleave", onRotEnd, { once: true });
                 window.addEventListener("blur", onRotEnd, { once: true });
                 return;
            }
            if (e.target.closest("#pipCanvas")) {
                if (e.button === 0 || e.button === 1) { 
                     e.preventDefault();
                     mapPanning = true; panStart.x = e.clientX; panStart.y = e.clientY;
                     document.addEventListener("mousemove", onPanMove);
                     document.addEventListener("mouseup", onPanEnd, { once: true });
                     document.addEventListener("mouseleave", onPanEnd, { once: true });
                     window.addEventListener("blur", onPanEnd, { once: true });
                     return;
                }
            } else if (e.target === pip) {
                if (e.button === 0) {
                    const rect = pip.getBoundingClientRect();
                    dragging = true;
                    pip.style.willChange = "transform, left, top";
                    pip.style.transition = "none";
                    pip.classList.add("dragging");
                    dragStart.x = e.clientX; dragStart.y = e.clientY;
                    dragStart.left = rect.left; dragStart.top = rect.top;
                    document.addEventListener("mousemove", onDragMove);
                    document.addEventListener("mouseup", onDragEnd, { once: true });
                    document.addEventListener("mouseleave", onDragEnd, { once: true });
                    window.addEventListener("blur", onDragEnd, { once: true });
                    return;
                }
            }
        });
        
        function clampPiPIntoViewport(evaluateAnchors = false) {
            const rect = pip.getBoundingClientRect();
            const vw = window.innerWidth, vh = window.innerHeight;
            
            let isAnchorRight = pip.style.right && pip.style.right !== 'auto';
            let isAnchorBottom = pip.style.bottom && pip.style.bottom !== 'auto';
            
            if (evaluateAnchors) {
                // Snap anchor to whichever half of the screen the center of the PiP is in
                isAnchorRight = (rect.left + rect.width / 2) > (vw / 2);
                isAnchorBottom = (rect.top + rect.height / 2) > (vh / 2);
            }
            
            let safeLeft = Math.max(25, Math.min(vw - rect.width - 25, rect.left));
            let safeTop = Math.max(25, Math.min(vh - rect.height - 25, rect.top));
            let safeRight = vw - (safeLeft + rect.width);
            let safeBottom = vh - (safeTop + rect.height);
            
            pip.style.left = isAnchorRight ? "auto" : safeLeft + "px";
            pip.style.right = isAnchorRight ? safeRight + "px" : "auto";
            pip.style.top = isAnchorBottom ? "auto" : safeTop + "px";
            pip.style.bottom = isAnchorBottom ? safeBottom + "px" : "auto";
            checkPiPCollision();
        }
        window.clampPiPIntoViewport = clampPiPIntoViewport;
        
        function checkPiPCollision() {
            if (window.innerWidth <= 768) return;
            const pipRect = pip.getBoundingClientRect();
            const leftPanel = document.getElementById('left-panel');
            const rightPanel = document.getElementById('right-panel');
            if (!leftPanel || !rightPanel) return;
            const lpRect = leftPanel.getBoundingClientRect();
            
            const overlap = !(pipRect.right < lpRect.left || 
                              pipRect.left > lpRect.right || 
                              pipRect.bottom < lpRect.top || 
                              pipRect.top > lpRect.bottom);
                              
            if (overlap) {
                leftPanel.classList.add('pip-collide');
                rightPanel.classList.add('pip-collide');
            } else {
                leftPanel.classList.remove('pip-collide');
                rightPanel.classList.remove('pip-collide');
            }
        }

        function loadPiPState() {
            if (window.innerWidth <= 768) return; 
            try {
                const raw = localStorage.getItem("mapPiPState.v4");
                if (!raw) return;
                const s = JSON.parse(raw);
                if (!s || typeof s !== "object") return;
                pip.style.position = "absolute";
                if (s.left !== undefined) pip.style.left = s.left + "px"; else pip.style.left = "auto";
                if (s.right !== undefined) pip.style.right = s.right + "px"; else pip.style.right = "auto";
                if (s.top !== undefined) pip.style.top = s.top + "px"; else pip.style.top = "auto";
                if (s.bottom !== undefined) pip.style.bottom = s.bottom + "px"; else pip.style.bottom = "auto";
                setTimeout(checkPiPCollision, 50);
            } catch {}
        }

        function savePiPState() {
            if (window.innerWidth <= 768) return;
            const state = {};
            if (pip.style.left !== 'auto') state.left = parseFloat(pip.style.left);
            if (pip.style.right !== 'auto') state.right = parseFloat(pip.style.right);
            if (pip.style.top !== 'auto') state.top = parseFloat(pip.style.top);
            if (pip.style.bottom !== 'auto') state.bottom = parseFloat(pip.style.bottom);
            try { localStorage.setItem("mapPiPState.v4", JSON.stringify(state)); } catch {}
        }

        const onDragMove = (e) => {
            if (!dragging) return;
            // During drag, force absolute left/top for 1:1 mouse tracking
            pip.style.left = (dragStart.left + (e.clientX - dragStart.x)) + "px";
            pip.style.top = (dragStart.top + (e.clientY - dragStart.y)) + "px";
            pip.style.right = "auto";
            pip.style.bottom = "auto";
            syncRect();
            checkPiPCollision();
        };
        const onDragEnd = () => { dragging = false; pip.style.willChange = "auto"; pip.classList.remove("dragging"); clampPiPIntoViewport(true); savePiPState(); document.removeEventListener("mousemove", onDragMove); document.removeEventListener("mouseleave", onDragEnd); window.removeEventListener("blur", onDragEnd); };
        
        const onRotMove = (e) => {
            if (!mapRotating) return;
            const dx = e.clientX - rotStart.x; const dy = e.clientY - rotStart.y;
            rotStart.x = e.clientX; rotStart.y = e.clientY;
            post({ type: 'PIP_ROTATE', dx, dy });
        };
        const onRotEnd = () => { mapRotating = false; document.removeEventListener("mousemove", onRotMove); document.removeEventListener("mouseleave", onRotEnd); window.removeEventListener("blur", onRotEnd); };
        
        const onPanMove = (e) => {
            if (!mapPanning) return;
            const dx = e.clientX - panStart.x; const dy = e.clientY - panStart.y;
            panStart.x = e.clientX; panStart.y = e.clientY;
            post({ type: 'PIP_PAN', dx, dy });
        };
        
        const onPanEnd = (e) => { 
            mapPanning = false; 
            document.removeEventListener("mousemove", onPanMove); 
            document.removeEventListener("mouseleave", onPanEnd); 
            window.removeEventListener("blur", onPanEnd); 
            // Clicks to move player
            if (e && e.clientX && Math.hypot(e.clientX - panStart.x, e.clientY - panStart.y) < 5) {
                const canvas = document.getElementById('pipCanvas');
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                post({ type: 'PIP_CLICK', x, y });
            }
        };

        // Resizing logic
        let resizing = false, currentHandle = "";
        let rStart = { x: 0, y: 0, w: 0, h: 0, l: 0, t: 0 };
        
        pip.querySelectorAll(".resize-handle").forEach((handle) => {
            handle.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                resizing = true;
                currentHandle = handle.className.split(" ")[1];
                const rect = pip.getBoundingClientRect();
                rStart = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, l: rect.left, t: rect.top };
                pip.classList.add("resizing");
                pip.style.transition = "none";
                pip.style.right = "auto";
                pip.style.left = rect.left + "px"; pip.style.top = rect.top + "px";
                document.addEventListener("mousemove", onResizeMove);
                document.addEventListener("mouseup", onResizeEnd, { once: true });
                document.addEventListener("mouseleave", onResizeEnd, { once: true });
                window.addEventListener("blur", onResizeEnd, { once: true });
            });
        });
        
        const onResizeMove = (e) => {
            if (!resizing) return;
            const dx = e.clientX - rStart.x, dy = e.clientY - rStart.y;
            let nw = rStart.w, nh = rStart.h, nl = rStart.l, nt = rStart.t;
            if (currentHandle.includes("e")) nw += dx;
            if (currentHandle.includes("s")) nh += dy;
            if (currentHandle.includes("w")) { nw -= dx; nl += dx; }
            if (currentHandle.includes("n")) { nh -= dy; nt += dy; }
            
            if (nw < MIN_W) { nl -= (MIN_W - nw) * (currentHandle.includes("w") ? 1 : 0); nw = MIN_W; }
            if (nh < MIN_H) { nt -= (MIN_H - nh) * (currentHandle.includes("n") ? 1 : 0); nh = MIN_H; }
            
            pip.style.width = nw + "px"; pip.style.height = nh + "px";
            pip.style.left = nl + "px"; pip.style.top = nt + "px";
            
            // Sync new dimensions for WebGL resolution matching
            syncRect();
        };
        const onResizeEnd = () => { 
            resizing = false; pip.classList.remove("resizing"); 
            clampPiPIntoViewport(); savePiPState(); syncRect(); 
            document.removeEventListener("mousemove", onResizeMove); 
            document.removeEventListener("mouseleave", onResizeEnd); 
            window.removeEventListener("blur", onResizeEnd); 
        };
        
        // Initialize
        loadPiPState();
        clampPiPIntoViewport(true);
        // Give layout a tick before measuring rect
        setTimeout(syncRect, 100);
        
        // Use ResizeObserver for perfect sync during ANY layout shifts, flex reflows, or browser resizes
        const ro = new ResizeObserver(() => {
            clampPiPIntoViewport();
            syncRect();
        });
        ro.observe(document.body);
        if (pip) ro.observe(pip);
        
    })();
    
    window.rollDiceAnimation = function(betIsEven, amount) {
        const logContainer = document.getElementById('event-log-container');
        if (!logContainer.classList.contains('show')) {
            window.emitAction('LOG'); // toggle it open if closed
        }
        
        const rect = logContainer.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.zIndex = '9999';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(rect.width, rect.height);
        overlay.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
        camera.position.z = 12;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // Create 2 dice
        const diceGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const diceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
        const die1 = new THREE.Mesh(diceGeo, diceMat);
        const die2 = new THREE.Mesh(diceGeo, diceMat);
        
        // Add green/red dots just like the main UI dice to make them look nice
        const dotMat = new THREE.MeshStandardMaterial({color: 0x111111});
        const dotGeo = new THREE.CircleGeometry(0.15, 16);
        const addDot = (mesh, x, y, z, rx, ry) => {
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(x,y,z);
            dot.rotation.set(rx,ry,0);
            mesh.add(dot);
        };
        // Just add one dot on each face for aesthetics
        addDot(die1, 0, 0, 0.61, 0, 0); addDot(die1, 0, 0, -0.61, 0, Math.PI);
        addDot(die1, 0.61, 0, 0, 0, Math.PI/2); addDot(die1, -0.61, 0, 0, 0, -Math.PI/2);
        addDot(die1, 0, 0.61, 0, -Math.PI/2, 0); addDot(die1, 0, -0.61, 0, Math.PI/2, 0);
        
        addDot(die2, 0, 0, 0.61, 0, 0); addDot(die2, 0, 0, -0.61, 0, Math.PI);
        addDot(die2, 0.61, 0, 0, 0, Math.PI/2); addDot(die2, -0.61, 0, 0, 0, -Math.PI/2);
        addDot(die2, 0, 0.61, 0, -Math.PI/2, 0); addDot(die2, 0, -0.61, 0, Math.PI/2, 0);

        scene.add(die1, die2);

        let startTime = performance.now();
        let duration = 1800; // 1.8 seconds bounce
        
        let d1 = { x: -2.0, y: 6, z: 0, vx: 0.04, vy: 0, vz: 0, rx: Math.random()*0.3, ry: Math.random()*0.3 };
        let d2 = { x: 2.0,  y: 6, z: 0, vx: -0.04, vy: 0, vz: 0, rx: Math.random()*0.3, ry: Math.random()*0.3 };
        
        function animate(t) {
            let elapsed = t - startTime;
            if (elapsed > duration) {
                document.body.removeChild(overlay);
                
                let roll1 = Math.floor(Math.random() * 6) + 1;
                let roll2 = Math.floor(Math.random() * 6) + 1;
                let sum = roll1 + roll2;
                let isEven = sum % 2 === 0;
                let win = (isEven === betIsEven);
                
                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `Rolled ${roll1} and ${roll2} (Total: ${sum})` }, '*');
                window.parent.postMessage({ type: 'WAGER_RESOLVE', win: win, amount: amount }, '*');
                return;
            }
            
            requestAnimationFrame(animate);
            
            d1.vy -= 0.015; d2.vy -= 0.015;
            d1.y += d1.vy; d2.y += d2.vy;
            d1.x += d1.vx; d2.x += d2.vx;
            
            if (d1.y < -3) { d1.y = -3; d1.vy *= -0.7; }
            if (d2.y < -3) { d2.y = -3; d2.vy *= -0.7; }
            
            die1.position.set(d1.x, d1.y, d1.z);
            die2.position.set(d2.x, d2.y, d2.z);
            
            die1.rotation.x += d1.rx; die1.rotation.y += d1.ry;
            die2.rotation.x += d2.rx; die2.rotation.y += d2.ry;
            
            if (elapsed > duration - 600) {
                d1.rx *= 0.92; d1.ry *= 0.92;
                d2.rx *= 0.92; d2.ry *= 0.92;
            }
            
            renderer.render(scene, camera);
        }
        requestAnimationFrame(animate);
    };

    setTimeout(() => {
        function getMoonPhase() {
            const today = new Date();
            let year = today.getFullYear();
            let month = today.getMonth() + 1;
            let day = today.getDate();
            if (month < 3) { year--; month += 12; }
            month++;
            const c = 365.25 * year;
            const e = 30.6 * month;
            let jd = c + e + day - 694039.09;
            jd /= 29.5305882;
            const b = Math.floor(jd);
            jd -= b;
            let phase = Math.round(jd * 8);
            if (phase >= 8) phase = 0;
            return phase;
        }
        const phase = getMoonPhase();
        const phaseNames = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
        if (window.logEvent) {
            window.logEvent(`Welcome to Origami Dungeon. Watch out [${phaseNames[phase]}]!`, 'system');
            setTimeout(() => {
                window.logEvent(`You are at the bottom of the stairs. A mysterious hallway leads to a chamber.`, 'system');
            }, 800);
        }
    }, 1000);
