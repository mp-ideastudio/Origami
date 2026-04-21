        // ======= PiP OFFSCREEN BRIDGE & TELEMETRY ========
        setTimeout(() => {
            const pipCanvas = document.getElementById('pip-map-canvas');
            if (pipCanvas && typeof pipCanvas.transferControlToOffscreen === 'function') {
                const offscreen = pipCanvas.transferControlToOffscreen();
                window.parent.postMessage({ type: 'PIP_CANVAS_TRANSFER', canvas: offscreen }, '*', [offscreen]);
            }

            const pip = document.getElementById('mapview-container');
            if (!pip) return;

            const MIN_W = 200, MIN_H = 200;
            let dragging = false, mapRotating = false, mapPanning = false, resizing = false;
            let dragStart = { x: 0, y: 0, left: 0, top: 0 };
            let rotStart = { x: 0, y: 0 };
            let panStart = { x: 0, y: 0 };
            let rStart = { x: 0, y: 0, w: 0, h: 0, l: 0, t: 0 };
            let currentHandle = "";
            let clickStart = { x: 0, y: 0 };

            function broadcastLayout() {
                const rect = pip.getBoundingClientRect();
                window.parent.postMessage({ type: 'PIP_LAYOUT', left: rect.left, top: rect.top, width: rect.width, height: rect.height }, '*');
            }

            function clampPiPIntoViewport() {
                const rect = pip.getBoundingClientRect();
                const vw = window.innerWidth, vh = window.innerHeight;
                let left = Math.min(Math.max(0, rect.left), Math.max(0, vw - rect.width));
                let top = Math.min(Math.max(0, rect.top), Math.max(0, vh - rect.height));
                pip.style.left = left + "px"; pip.style.top = top + "px"; pip.style.right = "auto";
                broadcastLayout();
            }

            function loadPiPState() {
                if (window.innerWidth <= 768) return; 
                try {
                    const raw = localStorage.getItem("mapPiPState.v1");
                    if (!raw) return;
                    const s = JSON.parse(raw);
                    if (!s || typeof s !== "object") return;
                    pip.style.position = "absolute";
                    if (typeof s.left === "number") { pip.style.left = s.left + "px"; pip.style.right = "auto"; }
                    if (typeof s.top === "number") pip.style.top = s.top + "px";
                    if (typeof s.width === "number") pip.style.width = Math.max(MIN_W, s.width) + "px";
                    if (typeof s.height === "number") pip.style.height = Math.max(MIN_H, s.height) + "px";
                } catch {}
                broadcastLayout();
            }

            function savePiPState() {
                if (window.innerWidth <= 768) return;
                const rect = pip.getBoundingClientRect();
                try { localStorage.setItem("mapPiPState.v1", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })); } catch {}
            }

            pip.addEventListener("contextmenu", e => { if (e.target.closest(".canvas-wrapper") || e.target.closest(".view-label")) e.preventDefault(); });
            
            pip.addEventListener("mouseup", (e) => {
                 if (e.button !== 0) return; 
                 const dist = Math.abs(e.clientX - clickStart.x) + Math.abs(e.clientY - clickStart.y);
                 if (dist > 5) return; 
                 if (e.target.closest(".canvas-wrapper") || e.target.closest(".view-label")) {
                     window.parent.postMessage({ type: 'PIP_INTERACTION', action: 'MODE_SWAP' }, '*');
                 }
            });
            
            pip.addEventListener("dblclick", (e) => {
                 e.stopPropagation();
                 if (e.target.closest(".canvas-wrapper") || e.target.closest(".view-label")) {
                     window.parent.postMessage({ type: 'PIP_INTERACTION', action: 'PAN_RESET' }, '*');
                 }
            });
            
            pip.addEventListener("mousedown", (e) => {
                clickStart = { x: e.clientX, y: e.clientY };
                if (e.target.closest(".resize-handle") || e.target.closest(".map-dpad") || e.target.closest(".zoom-slider-container")) return; 
                e.stopPropagation(); 
                
                if (e.button === 2) {
                     e.preventDefault();
                     mapRotating = true; rotStart.x = e.clientX; rotStart.y = e.clientY;
                     document.addEventListener("mousemove", onRotMove);
                     document.addEventListener("mouseup", onRotEnd, { once: true });
                     return;
                }
                if (e.target.closest(".canvas-wrapper") && (e.button === 0 || e.button === 1)) {
                     e.preventDefault();
                     mapPanning = true; panStart.x = e.clientX; panStart.y = e.clientY;
                     document.addEventListener("mousemove", onPanMove);
                     document.addEventListener("mouseup", onPanEnd, { once: true });
                     return;
                } else if (e.target.closest(".view-label") && e.button === 0) {
                    const rect = pip.getBoundingClientRect();
                    dragging = true; pip.style.willChange = "transform, left, top, width, height"; pip.style.transition = "none"; pip.classList.add("dragging");
                    dragStart.x = e.clientX; dragStart.y = e.clientY; dragStart.left = rect.left; dragStart.top = rect.top;
                    document.addEventListener("mousemove", onDragMove); document.addEventListener("mouseup", onDragEnd, { once: true });
                }
            });
            
            const onDragMove = (e) => { if (!dragging) return; pip.style.left = (dragStart.left + (e.clientX - dragStart.x)) + "px"; pip.style.top = (dragStart.top + (e.clientY - dragStart.y)) + "px"; pip.style.right = "auto"; broadcastLayout(); };
            const onDragEnd = () => { dragging = false; pip.style.willChange = "auto"; pip.classList.remove("dragging"); clampPiPIntoViewport(); savePiPState(); document.removeEventListener("mousemove", onDragMove); };
            const onRotMove = (e) => { if (!mapRotating) return; window.parent.postMessage({ type: 'PIP_INTERACTION', action: 'ROT_MOVE', dx: e.clientX - rotStart.x, dy: e.clientY - rotStart.y }, '*'); rotStart.x = e.clientX; rotStart.y = e.clientY; };
            const onRotEnd = () => { mapRotating = false; document.removeEventListener("mousemove", onRotMove); };
            const onPanMove = (e) => { if (!mapPanning) return; window.parent.postMessage({ type: 'PIP_INTERACTION', action: 'PAN_MOVE', dx: e.clientX - panStart.x, dy: e.clientY - panStart.y }, '*'); panStart.x = e.clientX; panStart.y = e.clientY; };
            const onPanEnd = () => { mapPanning = false; document.removeEventListener("mousemove", onPanMove); };
            
            pip.querySelectorAll(".resize-handle").forEach(handle => {
                handle.addEventListener("mousedown", (e) => {
                    if (e.button !== 0) return; e.stopPropagation();
                    resizing = true; currentHandle = handle.className.split(" ")[1];
                    const rect = pip.getBoundingClientRect();
                    rStart = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, l: rect.left, t: rect.top };
                    pip.classList.add("resizing"); pip.style.transition = "none"; pip.style.right = "auto";
                    pip.style.left = rect.left + "px"; pip.style.top = rect.top + "px";
                    document.addEventListener("mousemove", onResizeMove); document.addEventListener("mouseup", onResizeEnd, { once: true });
                });
            });
            const onResizeMove = (e) => {
                if (!resizing) return;
                const dx = e.clientX - rStart.x, dy = e.clientY - rStart.y;
                let nw = rStart.w, nh = rStart.h, nl = rStart.l, nt = rStart.t;
                if (currentHandle.includes("e")) nw += dx; if (currentHandle.includes("s")) nh += dy;
                if (currentHandle.includes("w")) { nw -= dx; nl += dx; } if (currentHandle.includes("n")) { nh -= dy; nt += dy; }
                if (nw >= MIN_W) { pip.style.width = nw + "px"; pip.style.left = nl + "px"; }
                if (nh >= MIN_H) { pip.style.height = nh + "px"; pip.style.top = nt + "px"; }
                broadcastLayout();
            };
            const onResizeEnd = () => { resizing = false; pip.classList.remove("resizing"); clampPiPIntoViewport(); savePiPState(); document.removeEventListener("mousemove", onResizeMove); };
            
            const zoomSlider = document.getElementById("map-zoom-slider");
            if (zoomSlider) {
                zoomSlider.addEventListener("input", (e) => {
                     window.parent.postMessage({ type: 'FPV_ACTION', action: 'CAMERA_ZOOM', value: parseFloat(e.target.value) }, '*');
                });
            }
            
            loadPiPState(); clampPiPIntoViewport(); broadcastLayout();
        }, 500);
