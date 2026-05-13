/**
 * LootCardBuilder.js — T0.1.E extraction from NewOrigami.Engine8.html
 *
 * Pure 3D geometry + Canvas 2D builders for loot cards.
 * No shared mutable state. THREE is bound from window.THREE (CDN global).
 *
 * Exports:
 *   getCardThemeColor(catId, elId)        → CSS color string
 *   getCardEdgeColor(elId, catId)         → hex number
 *   buildLegacyCardCanvas(opts)           → { canvas, cleanCardURL }
 *   buildLegacyLootIcon(opts)             → { iconMesh, customUpdate }
 *   GLASS_BUBBLE_GEO                      → THREE.SphereGeometry (shared)
 *   GLASS_BUBBLE_MAT                      → THREE.MeshPhysicalMaterial (shared)
 */

const THREE = window.THREE;

// ── Shared glass bubble (single allocation — every card reuses these) ─────────
export const GLASS_BUBBLE_GEO = new THREE.SphereGeometry(0.2, 32, 32);
export const GLASS_BUBBLE_MAT = new THREE.MeshPhysicalMaterial({
    color: 0xe0f0ff, transparent: true, opacity: 0.55,
    roughness: 0.05, metalness: 0.3,
    clearcoat: 1.0, clearcoatRoughness: 0.05, ior: 1.5,
    depthWrite: false
});

// ── Theme color map — 1:1 from legacy CSS var mapping ────────────────────────
export function getCardThemeColor(catId, elId) {
    if (catId === 'WIND' || catId === 'SPELL')                         return '#b0bec5';
    if (elId === 'EARTH')                                              return '#5C4033';
    if (catId === 'ITEM' || catId === 'SHIELD' || catId === 'DEFEND')  return '#5c6bc0';
    if (catId === 'WATER' || catId === 'THRUST')                       return '#0d6efd';
    if (catId === 'FIRE' || catId === 'SLASH' || catId === 'KATANA')   return '#ef5350';
    if (catId === 'MISSILE')                                           return '#ab47bc';
    if (catId === 'GOLD_COIN')                                         return '#b8860b';
    return '#66bb6a'; // SCROLL / default
}

// ── Edge color map — what the extruded card shell rim looks like ──────────────
export function getCardEdgeColor(elId, catId) {
    const m = { EARTH: 0x5C4033, WATER: 0x0d6efd, FIRE: 0xb71c1c, WIND: 0x37474f,
                SCROLL: 0x1b5e20, GOLD_COIN: 0xffd700 };
    return m[elId] || m[catId] || 0x444444;
}

// ── Canvas text helper ─────────────────────────────────────────────────────────
function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' '); let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight;
        } else line = testLine;
    }
    ctx.fillText(line, x, y);
}

// ── Build the BLACK playing-card canvas face (1:1 legacy) ─────────────────────
export function buildLegacyCardCanvas({ title, displayKanji, displayDesc, displayAttr,
                                        displayTypePill, catId, themeColor,
                                        isShopItem = false, price = 50 }) {
    const W = 256, H = 384;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Base dark background (matching dark-mode CSS)
    ctx.fillStyle = '#232527';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 24); else ctx.rect(0, 0, W, H);
    ctx.fill();

    // Thin theme-colored outer border (inset 1px to avoid corner tearing)
    ctx.strokeStyle = themeColor; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(1, 1, W-2, H-2, 23); else ctx.rect(1, 1, W-2, H-2);
    ctx.stroke();
    // Subtle inner highlight ring
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(2, 2, W-4, H-4, 22); else ctx.rect(2, 2, W-4, H-4);
    ctx.stroke();

    // Kanji (theme-colored, top-left)
    ctx.font = '900 32px sans-serif';
    ctx.fillStyle = themeColor;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(displayKanji, 20, 20);

    // Type pill (theme-colored bg, top-center)
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W/2 - 45, 20, 90, 30, 8); else ctx.rect(W/2-45, 20, 90, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '800 16px sans-serif';
    ctx.fillStyle = (catId === 'GOLD_COIN') ? '#000000' : '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(catId === 'GOLD_COIN' ? 'GOLD' : displayTypePill, W/2, 35);

    // Title (auto-scaling to prevent overflow)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let titleSize = 32;
    ctx.font = `900 ${titleSize}px sans-serif`;
    while (ctx.measureText(title).width > W*0.85 && titleSize > 12) {
        titleSize -= 1;
        ctx.font = `900 ${titleSize}px sans-serif`;
    }
    ctx.fillText(title, W/2, 90);

    // Desc (gray, centered, wrapped)
    ctx.font = '500 18px sans-serif'; ctx.fillStyle = '#999999';
    _wrapText(ctx, displayDesc, W/2, 130, W*0.8, 22);

    // Cache clean URL before punching the porthole
    const cleanCardURL = canvas.toDataURL();

    // Deep icon-cavity (porthole) hole cutout
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(W/2, H*0.58, 60, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Inner shadow gradient around the hole — gives the porthole depth
    const holeGrad = ctx.createRadialGradient(W/2, H*0.58, 45, W/2, H*0.58, 60);
    holeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    holeGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = holeGrad;
    ctx.beginPath(); ctx.arc(W/2, H*0.58, 60, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 3; ctx.stroke();

    // Solid black bottom block for attribute (no separator line)
    ctx.fillStyle = 'rgba(10, 10, 12, 0.8)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(1, H-50, W-2, 49, [0, 0, 23, 23]);
    else ctx.rect(1, H-50, W-2, 49);
    ctx.fill();

    // Attribute text inside the black block
    ctx.font = '800 18px sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    _wrapText(ctx, displayAttr, W/2, H-25, W*0.9, 22);

    if (isShopItem) {
        ctx.font = '900 24px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(price + ' Gold', W/2, H-15);
    }

    return { canvas, cleanCardURL };
}

// ── Build a 3D loot icon (1:1 legacy port — every kind) ──────────────────────
export function buildLegacyLootIcon({ catId, elId, originalTitle }) {
    const iconMesh = new THREE.Group();
    let customUpdate = null;

    // ── MAGIC LANTERN — flashlight w/ emissive lens ──────────────────────────
    if (originalTitle === 'MAGIC LANTERN') {
        const flashlight = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
        );
        flashlight.position.y = -0.1;
        const head = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.1, 0.25, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 })
        );
        head.position.y = 0.42;
        flashlight.add(head);
        const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 2.0 })
        );
        lens.position.y = 0.13;
        head.add(lens);
        iconMesh.add(flashlight);
        const lanternLight = new THREE.PointLight(0xfff5e0, 2.0, 10);
        lanternLight.position.set(0, 1, 1.5);
        iconMesh.add(lanternLight);
        customUpdate = (t, m) => {
            m.rotation.x = Math.sin(t * 1.5) * 0.1;
            m.rotation.y = t * 1.0;
            m.rotation.z = Math.PI / 4; // slanted
        };
    }
    // ── EARTH — bouncing dodecahedron ─────────────────────────────────────────
    else if (elId === 'EARTH') {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.6, 2),
            new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.8, flatShading: true })
        );
        iconMesh.add(rock);
        customUpdate = (t) => {
            rock.rotation.x = t * 1.8;
            rock.position.y = Math.abs(Math.sin(t * 3)) * 1.2;
        };
    }
    // ── FIRE — icosahedron core + 60 swirling flame tetrahedra ────────────────
    else if (elId === 'FIRE') {
        const core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.85, 1),
            new THREE.MeshStandardMaterial({ color: 0xb71c1c, emissive: 0x4a0000,
                emissiveIntensity: 3, flatShading: true })
        );
        iconMesh.add(core);
        const flames = [];
        for (let i = 0; i < 60; i++) {
            const flameColor = i%3===0 ? 0xffea00 : (i%2===0 ? 0xff4500 : 0xb71c1c);
            const emColor    = i%3===0 ? 0xffea00 : 0xff4500;
            const s = new THREE.Mesh(
                new THREE.TetrahedronGeometry(0.28, 0),
                new THREE.MeshStandardMaterial({
                    color: flameColor, emissive: emColor, emissiveIntensity: 2.5,
                    transparent: true, opacity: 0.9, depthWrite: false,
                    blending: THREE.AdditiveBlending, flatShading: true
                })
            );
            const ang = (i/60) * Math.PI*2, rad = 0.2 + Math.random()*0.45;
            s.position.set(Math.cos(ang)*rad, 0.3, Math.sin(ang)*rad);
            iconMesh.add(s);
            flames.push({ m: s, s: 3+Math.random()*6, o: Math.random()*Math.PI, rs: (Math.random()-0.5)*2 });
        }
        customUpdate = (t) => {
            core.rotation.y = t * 0.25;
            core.scale.setScalar(1 + Math.sin(t*3)*0.08);
            flames.forEach(f => {
                f.m.rotation.x += f.rs * 0.005;
                f.m.rotation.y += f.rs * 0.005;
                f.m.position.y = 0.3 + ((Math.sin(t*(f.s*0.5)+f.o)+1)*0.8);
                const sc = Math.max(0.1, 1 - (f.m.position.y/1.5));
                f.m.scale.set(sc*1.5, sc*2.5, sc*1.5);
            });
        };
    }
    // ── WIND — twin-spiral tornado made of tube geometry ──────────────────────
    else if (elId === 'WIND') {
        const tornado = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true,
            opacity: 0.8, side: THREE.DoubleSide });
        for (let i = 0; i < 2; i++) {
            const pts = [];
            const phase = (i/2) * Math.PI*2;
            for (let j = 0; j <= 40; j++) {
                const h = j/40;
                const r = Math.pow(h, 2.0)*1.5 + 0.2;
                const y = (h - 0.5) * 2.5;
                const angle = h * Math.PI*12 + phase;
                pts.push(new THREE.Vector3(Math.cos(angle)*r, y, Math.sin(angle)*r));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            const geo = new THREE.TubeGeometry(curve, 40, 0.075, 6, false);
            tornado.add(new THREE.Mesh(geo, mat));
        }
        tornado.position.y = -0.2;
        iconMesh.add(tornado);
        customUpdate = (t) => {
            tornado.rotation.y = t * -3.0;
            tornado.rotation.x = Math.sin(t*3.5) * 0.15;
        };
    }
    // ── WATER — animated fluid sphere with vertex-color waves ─────────────────
    else if (elId === 'WATER') {
        const geo = new THREE.SphereGeometry(1.75, 64, 64);
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.1, metalness: 0.1,
            vertexColors: true, emissive: 0x0d6efd, emissiveIntensity: 0.3
        });
        const pos = geo.attributes.position;
        const originalYs = new Float32Array(pos.count);
        for (let i = 0; i < pos.count; i++) originalYs[i] = pos.getY(i);
        geo.setAttribute('originalY', new THREE.BufferAttribute(originalYs, 1));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count*3), 3));
        const fluid = new THREE.Mesh(geo, mat);
        iconMesh.add(fluid);
        const _white = new THREE.Color(0xffffff);
        const _blue  = new THREE.Color(0x0d6efd);
        const _deep  = new THREE.Color(0x0a58ca);
        customUpdate = (t) => {
            const p = geo.attributes.position;
            const oy = geo.attributes.originalY;
            const c  = geo.attributes.color;
            for (let i = 0; i < p.count; i++) {
                const x = p.getX(i), z = p.getZ(i), y0 = oy.getX(i);
                const w = Math.sin(x*3.0 + t*4)*0.15 + Math.cos(z*2.5 + t*3.5)*0.1
                          + Math.sin((x+z)*5.0 + t*5.0)*0.05;
                const waterLevel = -0.2;
                if (y0 > waterLevel) {
                    const dist2D = Math.sqrt(x*x + z*z);
                    const maxR = Math.sqrt(1.75*1.75 - waterLevel*waterLevel);
                    if (dist2D < maxR) {
                        p.setY(i, waterLevel + w);
                        const mix = (w + 0.25) / 0.5;
                        const vc = _deep.clone().lerp(_white, mix);
                        c.setXYZ(i, vc.r, vc.g, vc.b);
                    } else { p.setY(i, y0); c.setXYZ(i, _blue.r, _blue.g, _blue.b); }
                } else { p.setY(i, y0); c.setXYZ(i, _blue.r, _blue.g, _blue.b); }
            }
            p.needsUpdate = true; c.needsUpdate = true;
            geo.computeVertexNormals();
        };
    }
    // ── KATANA / SLASH — sword with additive glow ─────────────────────────────
    else if (catId === 'KATANA' || originalTitle === 'SLASH') {
        const addGlow = (mesh) => {
            const glow = new THREE.Mesh(mesh.geometry.clone(),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                    opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }));
            glow.scale.setScalar(1.2); mesh.add(glow);
        };
        const bs = new THREE.Shape();
        bs.moveTo(0, 0); bs.quadraticCurveTo(-0.1, 1.0, -0.05, 2.0);
        bs.lineTo(0.15, 1.85); bs.quadraticCurveTo(0.2, 1.0, 0.2, 0); bs.lineTo(0, 0);
        const bladeGeo = new THREE.ExtrudeGeometry(bs, { depth: 0.1, bevelEnabled: true,
            bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        bladeGeo.center();
        const blade = new THREE.Mesh(bladeGeo,
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        blade.position.y = 1.0; addGlow(blade);
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12),
            new THREE.MeshBasicMaterial({ color: 0x8b0000, side: THREE.DoubleSide }));
        hilt.position.y = -0.4; addGlow(hilt);
        const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16),
            new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide }));
        addGlow(guard);
        const sword = new THREE.Group();
        sword.add(hilt, blade, guard);
        sword.position.set(0, -0.3, 0);
        sword.scale.set(0.8, 0.8, 0.1);
        iconMesh.add(sword);
        customUpdate = (t) => {
            sword.rotation.y = t * 1.5;
            sword.position.y = -0.3 + Math.sin(t*2)*0.1;
        };
    }
    // ── MISSILE / SHURIKEN — 8-point star ─────────────────────────────────────
    else if (catId === 'MISSILE' || originalTitle === 'SHURIKEN') {
        const addGlow = (mesh) => {
            const glow = new THREE.Mesh(mesh.geometry.clone(),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                    opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }));
            glow.scale.set(1.15, 1.15, 1.5); mesh.add(glow);
        };
        const star = new THREE.Shape();
        const oR = 1.8, iR = 0.45;
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4, r = i%2===0 ? oR : iR;
            if (i === 0) star.moveTo(Math.cos(a)*r, Math.sin(a)*r);
            else star.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        }
        const geo = new THREE.ExtrudeGeometry(star, { depth: 0.1, bevelEnabled: true,
            bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        geo.center();
        const starMesh = new THREE.Mesh(geo,
            new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5,
                roughness: 0.2, emissive: 0x666666, side: THREE.DoubleSide }));
        addGlow(starMesh);
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
        hole.rotation.x = Math.PI/2;
        const sg = new THREE.Group();
        sg.add(starMesh, hole);
        sg.scale.set(0.8, 0.8, 0.1);
        const star1 = sg, star2 = sg.clone();
        star2.rotation.y = Math.PI;
        iconMesh.add(star1, star2);
        customUpdate = (t) => {
            star1.rotation.z = -t*0.5;
            star2.rotation.z = -t*0.5;
        };
    }
    // ── SAMURAI HELMET (Kabuto) — dome + face guard + crescent horns ──────────
    else if (originalTitle === 'SAMURAI HELMET') {
        const addOutline = (mesh) => {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            mesh.add(new THREE.LineSegments(edges,
                new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
        };
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff,
            roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffaa00,
            metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide });
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(1.0, 16, 16, 0, Math.PI*2, 0, Math.PI/2),
            helmetMat);
        dome.position.y = -0.2; addOutline(dome);
        const guard = new THREE.Mesh(
            new THREE.CylinderGeometry(1.1, 1.2, 0.4, 16, 1, false, Math.PI*0.75, Math.PI*1.5),
            helmetMat);
        guard.position.y = -0.4; addOutline(guard);
        const hornShape = new THREE.Shape();
        hornShape.moveTo(0, 0);
        hornShape.quadraticCurveTo(0.8, 0.8, 1.2, 1.8);
        hornShape.quadraticCurveTo(0.8, 0.4, 0.2, 0.2);
        hornShape.lineTo(0, 0);
        const hornGeo = new THREE.ExtrudeGeometry(hornShape, { depth: 0.1, bevelEnabled: true,
            bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        const horn1 = new THREE.Mesh(hornGeo, goldMat);
        horn1.position.set(0, 0.3, 0.9); horn1.rotation.z = -0.3; horn1.rotation.y = 0.2;
        addOutline(horn1);
        const horn2 = new THREE.Mesh(hornGeo, goldMat);
        horn2.position.set(0, 0.3, 0.9); horn2.rotation.y = Math.PI - 0.2; horn2.rotation.z = -0.3;
        addOutline(horn2);
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), goldMat);
        boss.position.set(0, 0.4, 1.0); addOutline(boss);
        iconMesh.add(dome, guard, horn1, horn2, boss);
        iconMesh.scale.set(1.0, 1.0, 0.1);
        customUpdate = (t, m) => { m.rotation.y = t * 1.5; };
    }
    // ── SHIELD / ARMOR — extruded shield shape ────────────────────────────────
    else if (originalTitle === 'SHIELD' || catId === 'SHIELD' || catId === 'ARMOR') {
        const addOutline = (mesh) => {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            mesh.add(new THREE.LineSegments(edges,
                new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
        };
        const ss = new THREE.Shape();
        ss.moveTo(0, -1.2);
        ss.quadraticCurveTo(1.2, -0.2, 1.0, 1.0);
        ss.lineTo(-1.0, 1.0);
        ss.quadraticCurveTo(-1.2, -0.2, 0, -1.2);
        const sg = new THREE.ExtrudeGeometry(ss, { depth: 0.1, bevelEnabled: true,
            bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        sg.center();
        const shield = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xffffff,
            metalness: 0.5, roughness: 0.3, emissive: 0x444444, side: THREE.DoubleSide }));
        shield.scale.set(1.4, 1.4, 0.14); addOutline(shield);
        const innerGeo = new THREE.ExtrudeGeometry(ss, { depth: 0.1, bevelEnabled: false });
        innerGeo.center();
        const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({
            color: 0xffffff, metalness: 0.1, roughness: 0.2, side: THREE.DoubleSide }));
        inner.scale.set(0.5, 0.5, 1.0);
        addOutline(inner);
        shield.add(inner);
        iconMesh.add(shield);
        customUpdate = (t) => { shield.rotation.y = t * 1.5; };
    }
    // ── POTION / SCROLL — glass flask with sloshing liquid ────────────────────
    else if (originalTitle === 'POTION' || catId === 'SCROLL') {
        const potion = new THREE.Group();
        const glass = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.1,
            metalness: 0.4, transparent: true, opacity: 0.4, depthWrite: false });
        const cork  = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9, metalness: 0.1 });
        const liq   = new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true,
            opacity: 0.9, blending: THREE.AdditiveBlending });
        const base = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), glass);
        const liquid = new THREE.Mesh(
            new THREE.SphereGeometry(0.85, 16, 16, 0, Math.PI*2, Math.PI/2, Math.PI/2), liq);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.8, 16), glass);
        neck.position.y = 1.0;
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.1, 8, 16), glass);
        lip.position.y = 1.4; lip.rotation.x = Math.PI/2;
        const corkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 12), cork);
        corkMesh.position.y = 1.55;
        potion.add(base, liquid, neck, lip, corkMesh);
        potion.position.y = -0.4;
        iconMesh.add(potion);
        customUpdate = (t) => {
            potion.rotation.y = t * 1.5;
            potion.rotation.z = Math.sin(t*2) * 0.1;
            liquid.rotation.x = Math.sin(t*5) * 0.2;
            liquid.rotation.z = Math.cos(t*4) * 0.2;
        };
    }
    // ── GOLD COIN — yen-style extruded gold w/ square hole, gradient texture ──
    else if (catId === 'GOLD_COIN') {
        const coinShape = new THREE.Shape();
        coinShape.arc(0, 0, 1.68, 0, Math.PI*2, false);
        const hole = new THREE.Path();
        hole.moveTo(-0.48, 0.48); hole.lineTo(0.48, 0.48);
        hole.lineTo(0.48, -0.48); hole.lineTo(-0.48, -0.48); hole.lineTo(-0.48, 0.48);
        coinShape.holes.push(hole);
        const coinGeo = new THREE.ExtrudeGeometry(coinShape, { depth: 0.8, bevelEnabled: true,
            bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 });
        coinGeo.center();
        // Faux-metal gradient
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 128; tCanvas.height = 128;
        const tCtx = tCanvas.getContext('2d');
        const grd = tCtx.createLinearGradient(0, 0, 128, 128);
        grd.addColorStop(0, '#d4af37'); grd.addColorStop(0.3, '#b8860b');
        grd.addColorStop(0.5, '#d4af37'); grd.addColorStop(0.7, '#6b4f00');
        grd.addColorStop(1, '#b8860b');
        tCtx.fillStyle = grd; tCtx.fillRect(0, 0, 128, 128);
        const coin = new THREE.Mesh(coinGeo,
            (() => {
                const _t = new THREE.CanvasTexture(tCanvas);
                _t.generateMipmaps = false; _t.minFilter = THREE.LinearFilter;
                return new THREE.MeshBasicMaterial({ map: _t, side: THREE.DoubleSide });
            })());
        iconMesh.add(coin);
        customUpdate = () => {}; // legacy: coin is static
    }
    // ── DICE fallback ─────────────────────────────────────────────────────────
    else {
        const die = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.6, 1.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 })
        );
        iconMesh.add(die);
        customUpdate = (t, m) => {
            m.rotation.y = t * 1.5;
            m.rotation.x = Math.sin(t*2) * 0.5;
        };
    }

    return { iconMesh, customUpdate };
}

export default buildLegacyLootIcon;
