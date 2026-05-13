/**
 * ProceduralTextures.js — T0.1.C extraction from NewOrigami.Engine8.html
 *
 * Pure canvas-based texture generators. Each function returns a THREE.CanvasTexture.
 * THREE is bound from window (CDN global) — no ES module import needed for Three.js.
 *
 * Exports:
 *   createWashiPaperTexture()
 *   createDungeonFloorTexture()
 *   createDarkWoodRafterTexture()
 *   createSpiderwebVariantA/B/C/D/E/F()
 *   createDungeonTopTexture()
 *   createShojiTexture()
 *   createShojiDoorTexture()
 *   makePaperTexture(baseColor)
 */

// Three.js is loaded as a CDN global before this module runs.
const THREE = window.THREE;

export function createWashiPaperTexture(){
    const sz=256, c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    // Warm cream washi base
    const grad=ctx.createLinearGradient(0,0,0,sz);
    grad.addColorStop(0,'#fff2c8'); grad.addColorStop(0.5,'#ffd985'); grad.addColorStop(1,'#ffb060');
    ctx.fillStyle=grad; ctx.fillRect(0,0,sz,sz);
    // Paper fiber noise
    for(let i=0;i<800;i++){
        ctx.fillStyle=`rgba(120,70,30,${Math.random()*0.08})`;
        ctx.fillRect(Math.random()*sz,Math.random()*sz,1+Math.random()*2,1);
    }
    // Horizontal bamboo strut shadows (rings around lantern)
    ctx.strokeStyle='rgba(60,30,10,0.45)'; ctx.lineWidth=2;
    for(let y=20;y<sz;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(sz,y);ctx.stroke();}
    // Faint kanji "灯" (light) center
    ctx.fillStyle='rgba(120,30,10,0.6)';
    ctx.font='900 110px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('灯',sz/2,sz/2);
    // Top/bottom dark caps
    ctx.fillStyle='#1a0e05'; ctx.fillRect(0,0,sz,8); ctx.fillRect(0,sz-8,sz,8);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

export function createDungeonFloorTexture(){
    // Charcoal gray-brown weathered planks — matched to the wall wood tone.
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    // Base: charcoal gray-brown (cool, dusty, ancient)
    ctx.fillStyle='#22201d'; ctx.fillRect(0,0,sz,sz);
    // Cool gray noise wash
    const id=ctx.getImageData(0,0,sz,sz),d=id.data;
    for(let i=0;i<d.length;i+=4){
        const n=(Math.random()-0.5)*10;
        d[i]  =Math.max(0,Math.min(255,d[i]  +n+1));
        d[i+1]=Math.max(0,Math.min(255,d[i+1]+n+1));
        d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
    }
    ctx.putImageData(id,0,0);
    // Long horizontal planks (4 × wide-grain) for floor look
    const nPlanks=4, pH=sz/nPlanks;
    for(let p=0;p<nPlanks;p++){
        const y=p*pH;
        // Plank tonal variation — each plank slightly different gray-brown
        const tone = 28 + Math.floor(Math.random()*10);
        ctx.fillStyle = `rgb(${tone},${tone-2},${tone-4})`;
        ctx.fillRect(0, y+2, sz, pH-4);
        // Dark seam between planks
        ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,y,sz,3);
        // Wood grain streaks (long horizontal)
        ctx.strokeStyle='rgba(70,60,50,0.42)'; ctx.lineWidth=1;
        for(let g=0;g<14;g++){
            ctx.beginPath();
            const gy=y+6+Math.random()*(pH-12);
            ctx.moveTo(0,gy);
            for(let x=0;x<=sz;x+=64) ctx.lineTo(x,gy+(Math.random()-0.5)*3);
            ctx.stroke();
        }
        // Aged dark patches
        for(let s=0;s<6;s++){
            const ax=Math.random()*sz, ay=y+pH*0.5+(Math.random()-0.5)*pH*0.7;
            const ag=ctx.createRadialGradient(ax,ay,0,ax,ay,18+Math.random()*20);
            ag.addColorStop(0,'rgba(0,0,0,0.35)'); ag.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=ag; ctx.fillRect(ax-40,ay-40,80,80);
        }
        // Knots — dark concentric rings
        for(let k=0;k<2;k++){
            const kx=20+Math.random()*(sz-40), ky=y+8+Math.random()*(pH-16);
            const kg=ctx.createRadialGradient(kx,ky,0,kx,ky,9);
            kg.addColorStop(0,'rgba(0,0,0,0.85)'); kg.addColorStop(0.6,'rgba(20,15,10,0.5)'); kg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=kg; ctx.fillRect(kx-12,ky-12,24,24);
        }
        // Hairline cracks
        ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=0.7;
        for(let cr=0;cr<3;cr++){
            const cx=Math.random()*sz, cyy=y+4+Math.random()*(pH-8);
            ctx.beginPath(); ctx.moveTo(cx,cyy);
            ctx.lineTo(cx+30+Math.random()*60, cyy+(Math.random()-0.5)*3);
            ctx.stroke();
        }
        // Dust motes
        for(let s=0;s<24;s++){
            ctx.fillStyle=`rgba(140,130,115,${Math.random()*0.05})`;
            ctx.fillRect(Math.random()*sz, y+Math.random()*pH, 2, 1);
        }
    }
    // Subtle tile bevel
    ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=4; ctx.strokeRect(2,2,sz-4,sz-4);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

export function createDarkWoodRafterTexture(){
    // Charcoal gray-brown rafter ceiling matching the floor + wall tone.
    // Rafters are randomly thick/thin, knot-laced, cracked old timber.
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#15130f'; ctx.fillRect(0,0,sz,sz);
    // Cool charcoal wash
    const id=ctx.getImageData(0,0,sz,sz),d=id.data;
    for(let i=0;i<d.length;i+=4){const r=(Math.random()-0.5)*12;d[i]+=r+1;d[i+1]+=r+1;d[i+2]+=r;}
    ctx.putImageData(id,0,0);

    // Random major rafter beams — varied spacing & thickness for that
    // hand-hewn old-castle feel.
    let y = 0;
    while(y < sz){
        const beamH = 36 + Math.random()*32;       // varied thickness
        const gap   = 12 + Math.random()*22;       // varied gap
        // Tonal variation per beam
        const tA = 26 + Math.floor(Math.random()*14);
        const tB = 38 + Math.floor(Math.random()*14);
        const grad = ctx.createLinearGradient(0,y,0,y+beamH);
        grad.addColorStop(0,   `rgb(${tA-6},${tA-8},${tA-10})`);
        grad.addColorStop(0.5, `rgb(${tB},${tB-4},${tB-8})`);
        grad.addColorStop(1,   `rgb(${tA-10},${tA-12},${tA-14})`);
        ctx.fillStyle=grad; ctx.fillRect(0,y,sz,beamH);

        // Long grain striations along this beam
        ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=1;
        for(let i=0;i<14;i++){
            const gy = y + 2 + Math.random()*(beamH-4);
            ctx.beginPath(); ctx.moveTo(0,gy);
            for(let xx=0;xx<=sz;xx+=80) ctx.lineTo(xx, gy+(Math.random()-0.5)*2);
            ctx.stroke();
        }
        // Random knots along the beam
        const knots = 2 + Math.floor(Math.random()*3);
        for(let k=0;k<knots;k++){
            const kx = 30 + Math.random()*(sz-60);
            const ky = y + 6 + Math.random()*(beamH-12);
            const kr = 5 + Math.random()*7;
            const kg = ctx.createRadialGradient(kx,ky,0, kx,ky,kr);
            kg.addColorStop(0,'rgba(0,0,0,0.92)');
            kg.addColorStop(0.55,'rgba(15,10,6,0.55)');
            kg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=kg; ctx.fillRect(kx-kr,ky-kr,kr*2,kr*2);
        }
        // Hairline cracks running along grain
        ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=0.8;
        for(let cr=0;cr<2;cr++){
            const cy = y + 4 + Math.random()*(beamH-8);
            const cx = Math.random()*sz, cl = 60+Math.random()*120;
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+cl, cy+(Math.random()-0.5)*2); ctx.stroke();
        }
        // Beam edge shadow seam (top & bottom)
        ctx.fillStyle='rgba(0,0,0,0.95)'; ctx.fillRect(0,y,sz,1);
        ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,y+beamH-2,sz,2);
        // Gap (dark void between beams)
        ctx.fillStyle='#080604'; ctx.fillRect(0, y+beamH, sz, gap);
        y += beamH + gap;
    }
    // Sparse iron-bracket cross-supports
    for(let x=0;x<sz;x+=160 + Math.random()*60){
        ctx.fillStyle='rgba(15,10,6,0.7)'; ctx.fillRect(x|0, 0, 18, sz);
        // bolt heads
        ctx.fillStyle='rgba(50,40,30,0.6)';
        for(let by=20; by<sz; by+=80+Math.random()*30){
            ctx.beginPath(); ctx.arc((x|0)+9, by, 2.2, 0, Math.PI*2); ctx.fill();
        }
    }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

// ── 3 precompiled spider web variants for top-corner placement ────────────────
export function createSpiderwebVariantA(){
    // Classic radial corner web (full 90° arc)
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.5;
    for(let i=0;i<=90;i+=10){
        const r=i*Math.PI/180; ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(Math.cos(r)*sz,Math.sin(r)*sz); ctx.stroke();
    }
    ctx.strokeStyle='rgba(220,220,225,0.45)'; ctx.lineWidth=1.2;
    for(let r=40;r<=sz-30;r+=32){
        ctx.beginPath();
        for(let i=0;i<=90;i+=10){
            const rad=i*Math.PI/180, sr=r+(Math.random()*8-4);
            const px=Math.cos(rad)*sr, py=Math.sin(rad)*sr;
            if(i===0) ctx.moveTo(px,py);
            else{
                const mr=((i-5)*Math.PI/180), mid=r-12;
                ctx.quadraticCurveTo(Math.cos(mr)*mid,Math.sin(mr)*mid,px,py);
            }
        }
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}
export function createSpiderwebVariantB(){
    // Tattered / broken web — half torn away, fewer rings
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    ctx.strokeStyle='rgba(220,220,210,0.45)'; ctx.lineWidth=1.5;
    // Only some radials, rest broken short
    for(let i=0;i<=90;i+=12){
        const r=i*Math.PI/180; ctx.beginPath();
        ctx.moveTo(0,0);
        const len = Math.random()<0.4 ? sz*0.4 : sz; // broken short ones
        ctx.lineTo(Math.cos(r)*len,Math.sin(r)*len); ctx.stroke();
    }
    // Sagging strands instead of clean rings
    ctx.strokeStyle='rgba(200,200,200,0.30)'; ctx.lineWidth=0.9;
    for(let r=70;r<=sz-30;r+=55){
        ctx.beginPath();
        let started=false;
        for(let i=0;i<=90;i+=10){
            if(Math.random()<0.25){ started=false; continue; } // gap
            const rad=i*Math.PI/180, sr=r+Math.random()*20-10;
            const px=Math.cos(rad)*sr, py=Math.sin(rad)*sr+r*0.15; // sag
            if(!started){ ctx.moveTo(px,py); started=true; }
            else ctx.lineTo(px,py);
        }
        ctx.stroke();
    }
    // Dangling silk strand
    ctx.strokeStyle='rgba(200,200,200,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(sz*0.3,sz*0.3); ctx.lineTo(sz*0.32,sz*0.85); ctx.stroke();
    return new THREE.CanvasTexture(c);
}
export function createSpiderwebVariantC(){
    // Dense corner cluster — heavy with dust
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    // Background haze
    const grad=ctx.createRadialGradient(0,0,0,0,0,sz*0.7);
    grad.addColorStop(0,'rgba(230,230,225,0.22)'); grad.addColorStop(1,'rgba(230,230,225,0)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,sz,sz);
    // Many radials, denser
    ctx.strokeStyle='rgba(245,245,240,0.6)'; ctx.lineWidth=1.4;
    for(let i=0;i<=90;i+=6){
        const r=i*Math.PI/180; ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(Math.cos(r)*sz,Math.sin(r)*sz); ctx.stroke();
    }
    // Dense spiral rings
    ctx.strokeStyle='rgba(240,240,235,0.42)'; ctx.lineWidth=1.0;
    for(let r=25;r<=sz-20;r+=20){
        ctx.beginPath();
        for(let i=0;i<=90;i+=6){
            const rad=i*Math.PI/180, sr=r+(Math.random()*6-3);
            const px=Math.cos(rad)*sr, py=Math.sin(rad)*sr;
            if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.stroke();
    }
    // Dust specks
    for(let i=0;i<60;i++){
        ctx.fillStyle=`rgba(180,170,150,${0.2+Math.random()*0.3})`;
        const a=Math.random()*Math.PI/2, rr=20+Math.random()*(sz-40);
        ctx.fillRect(Math.cos(a)*rr,Math.sin(a)*rr,1.5,1.5);
    }
    return new THREE.CanvasTexture(c);
}

// ---- 3 FRACTAL web variants (recursive geometry, no two ever look alike) ----
export function createSpiderwebVariantD(){
    // Recursive branching tree-web (L-system style)
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    ctx.translate(0,0);
    // Recursive branch grown from corner outward
    function branch(x, y, ang, len, depth, alpha){
        if(depth<=0 || len<3) return;
        const x2 = x + Math.cos(ang)*len, y2 = y + Math.sin(ang)*len;
        ctx.strokeStyle = `rgba(230,230,225,${alpha})`;
        ctx.lineWidth = Math.max(0.5, depth*0.35);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2); ctx.stroke();
        // Two child branches with golden-ratio-ish split + jitter
        const split = 0.42 + Math.random()*0.28;
        const jitter = (Math.random()-0.5)*0.35;
        branch(x2, y2, ang - split + jitter, len*(0.62+Math.random()*0.12), depth-1, alpha*0.92);
        branch(x2, y2, ang + split + jitter, len*(0.58+Math.random()*0.14), depth-1, alpha*0.88);
        // Occasional third sub-strand
        if(Math.random()<0.35){
            branch(x2, y2, ang + (Math.random()-0.5)*0.8, len*0.45, depth-2, alpha*0.7);
        }
    }
    // Several primary branches sweeping the corner quadrant
    for(let i=0;i<7;i++){
        const ang = (Math.PI/2) * (i/6) + (Math.random()-0.5)*0.06;
        branch(0, 0, ang, sz*0.95, 7, 0.65);
    }
    // Faint connective spiral (ties the fractal together)
    ctx.strokeStyle='rgba(220,220,215,0.22)'; ctx.lineWidth=0.6;
    for(let r=40;r<sz-30;r+=22+Math.random()*10){
        ctx.beginPath();
        for(let i=0;i<=90;i+=12){
            const rad=i*Math.PI/180, sr=r+(Math.random()*14-7);
            const px=Math.cos(rad)*sr, py=Math.sin(rad)*sr;
            if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}
export function createSpiderwebVariantE(){
    // Sierpinski-style splintered shard web — jagged, alien geometry
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    function splinter(p1, p2, p3, depth){
        if(depth<=0){
            ctx.strokeStyle = `rgba(240,240,232,${0.18 + depth*0.06})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
            ctx.lineTo(p3[0],p3[1]); ctx.closePath(); ctx.stroke();
            return;
        }
        const m12 = [(p1[0]+p2[0])/2 + (Math.random()-0.5)*8, (p1[1]+p2[1])/2 + (Math.random()-0.5)*8];
        const m23 = [(p2[0]+p3[0])/2 + (Math.random()-0.5)*8, (p2[1]+p3[1])/2 + (Math.random()-0.5)*8];
        const m31 = [(p3[0]+p1[0])/2 + (Math.random()-0.5)*8, (p3[1]+p1[1])/2 + (Math.random()-0.5)*8];
        // Outer shard
        ctx.strokeStyle = `rgba(245,245,240,${0.42 - depth*0.05})`;
        ctx.lineWidth = Math.max(0.6, depth*0.5);
        ctx.beginPath();
        ctx.moveTo(p1[0],p1[1]); ctx.lineTo(m12[0],m12[1]);
        ctx.lineTo(m31[0],m31[1]); ctx.closePath(); ctx.stroke();
        // Recurse into 3 corner shards (skip central inverted triangle for fractal hole)
        splinter(p1, m12, m31, depth-1);
        splinter(m12, p2, m23, depth-1);
        splinter(m31, m23, p3, depth-1);
    }
    splinter([0,0], [sz, 4], [4, sz], 5);
    // Faint anchoring strands from corner
    ctx.strokeStyle='rgba(230,230,225,0.45)'; ctx.lineWidth=0.9;
    for(let i=0;i<5;i++){
        const ang = (Math.PI/2)*(i/4) + (Math.random()-0.5)*0.08;
        ctx.beginPath(); ctx.moveTo(0,0);
        // Jaggy zigzag anchor
        let x=0,y=0;
        for(let s=0; s<8; s++){
            const seg = sz*0.12;
            x += Math.cos(ang)*seg + (Math.random()-0.5)*8;
            y += Math.sin(ang)*seg + (Math.random()-0.5)*8;
            ctx.lineTo(x,y);
        }
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}
export function createSpiderwebVariantF(){
    // Recursive sagging filament — long catenary chains that branch
    const sz=512,c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    function sag(x1,y1, x2,y2, depth, alpha){
        if(depth<=0) return;
        // Catenary midpoint pulled downward
        const mx = (x1+x2)/2 + (Math.random()-0.5)*6;
        const my = (y1+y2)/2 + 8 + Math.random()*14;
        ctx.strokeStyle = `rgba(225,225,220,${alpha})`;
        ctx.lineWidth = Math.max(0.5, depth*0.32);
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.quadraticCurveTo(mx,my, x2,y2);
        ctx.stroke();
        // Recurse — children branch off mid-strand
        if(Math.random()<0.7) sag(x1,y1, mx,my, depth-1, alpha*0.8);
        if(Math.random()<0.7) sag(mx,my, x2,y2, depth-1, alpha*0.8);
        // Occasional droplet/anchor strand hanging from midpoint
        if(depth>1 && Math.random()<0.4){
            const dx = mx + (Math.random()-0.5)*40;
            const dy = my + 30 + Math.random()*60;
            sag(mx,my, dx,dy, depth-2, alpha*0.7);
        }
    }
    // Several anchor points along corner edges
    const anchors = [];
    for(let i=0;i<6;i++){
        anchors.push([0, 30 + i*(sz/6) + Math.random()*20]);
        anchors.push([30 + i*(sz/6) + Math.random()*20, 0]);
    }
    // Connect random pairs with sagging filaments
    for(let i=0;i<14;i++){
        const a = anchors[Math.floor(Math.random()*anchors.length)];
        const b = anchors[Math.floor(Math.random()*anchors.length)];
        if(a===b) continue;
        sag(a[0],a[1], b[0],b[1], 4, 0.5);
    }
    // Sparse radials from origin for cohesion
    ctx.strokeStyle='rgba(220,220,215,0.32)'; ctx.lineWidth=0.7;
    for(let i=0;i<=4;i++){
        const r = (Math.PI/2)*(i/4);
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(r)*sz*0.95, Math.sin(r)*sz*0.95);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}

export function createDungeonTopTexture(){
    const c=document.createElement('canvas'); c.width=c.height=128;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#1e1e1e'; ctx.fillRect(0,0,128,128);
    for(let i=0;i<500;i++){ctx.fillStyle=`rgba(0,0,0,${Math.random()*0.15})`;ctx.fillRect(Math.random()*128,Math.random()*128,2,2);}
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

// ── Shoji Panel Texture (warm rice paper + dark wooden lattice frame) ─────────
export function createShojiTexture(){
    const sz=512, c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    // Warm cream rice-paper base
    const grad=ctx.createLinearGradient(0,0,0,sz);
    grad.addColorStop(0,'#f8eccd'); grad.addColorStop(0.5,'#e8d5a8'); grad.addColorStop(1,'#d4bf85');
    ctx.fillStyle=grad; ctx.fillRect(0,0,sz,sz);
    // Paper fiber noise
    for(let i=0;i<1200;i++){
        ctx.fillStyle=`rgba(120,80,40,${Math.random()*0.07})`;
        ctx.fillRect(Math.random()*sz,Math.random()*sz,1+Math.random()*2,1);
    }
    // Subtle horizontal fiber streaks
    ctx.strokeStyle='rgba(140,100,60,0.10)'; ctx.lineWidth=0.6;
    for(let i=0;i<40;i++){
        const y=Math.random()*sz; ctx.beginPath();
        ctx.moveTo(0,y); ctx.lineTo(sz,y+Math.random()*4-2); ctx.stroke();
    }
    // Dark wooden lattice (kumiko grid) — the iconic shoji look
    const woodMat = ctx.createLinearGradient(0,0,8,0);
    woodMat.addColorStop(0,'#1a0e05'); woodMat.addColorStop(0.5,'#2a1a0d'); woodMat.addColorStop(1,'#1a0e05');
    ctx.fillStyle=woodMat;
    // Outer wooden frame
    ctx.fillRect(0,0,sz,14); ctx.fillRect(0,sz-14,sz,14);
    ctx.fillRect(0,0,14,sz); ctx.fillRect(sz-14,0,14,sz);
    // Vertical kumiko bars (6 evenly spaced)
    for(let i=1;i<=5;i++){
        const x = (sz/6)*i - 3;
        ctx.fillStyle='#1f1208'; ctx.fillRect(x,14,6,sz-28);
    }
    // Horizontal kumiko bars (4 evenly spaced)
    for(let i=1;i<=4;i++){
        const y = (sz/5)*i - 3;
        ctx.fillStyle='#1f1208'; ctx.fillRect(14,y,sz-28,6);
    }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; return t;
}

// ── Shoji Door Texture (vertical center seam — sliding panel split) ──────────
export function createShojiDoorTexture(){
    const sz=512, c=document.createElement('canvas'); c.width=c.height=sz;
    const ctx=c.getContext('2d');
    // Same warm paper base
    const grad=ctx.createLinearGradient(0,0,0,sz);
    grad.addColorStop(0,'#f8eccd'); grad.addColorStop(0.5,'#e8d5a8'); grad.addColorStop(1,'#d4bf85');
    ctx.fillStyle=grad; ctx.fillRect(0,0,sz,sz);
    for(let i=0;i<1200;i++){
        ctx.fillStyle=`rgba(120,80,40,${Math.random()*0.07})`;
        ctx.fillRect(Math.random()*sz,Math.random()*sz,1+Math.random()*2,1);
    }
    // Outer + center frame (door split)
    ctx.fillStyle='#1a0e05';
    ctx.fillRect(0,0,sz,14); ctx.fillRect(0,sz-14,sz,14);
    ctx.fillRect(0,0,14,sz); ctx.fillRect(sz-14,0,14,sz);
    // Center seam — two-panel sliding door
    ctx.fillRect(sz/2-5,14,10,sz-28);
    // Lattice on each panel half
    const half = sz/2;
    for(let panel=0; panel<2; panel++){
        const x0 = panel*half;
        // 3 vertical bars per panel
        for(let i=1;i<=2;i++){
            const x = x0 + (half/3)*i - 3;
            ctx.fillStyle='#1f1208'; ctx.fillRect(x,14,6,sz-28);
        }
        // 4 horizontal bars
        for(let i=1;i<=4;i++){
            const y = (sz/5)*i - 3;
            ctx.fillStyle='#1f1208'; ctx.fillRect(x0+14,y,half-28,6);
        }
    }
    // Small brass pull-handle indicator on each side of seam
    ctx.fillStyle='#8b7340';
    ctx.fillRect(sz/2-22,sz/2-12,12,24);
    ctx.fillRect(sz/2+10,sz/2-12,12,24);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; return t;
}

export function makePaperTexture(baseColor){
    const c=document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d');
    ctx.fillStyle=baseColor; ctx.fillRect(0,0,256,256);
    for(let i=0;i<400;i++){const x=Math.random()*256,y=Math.random()*256,w=Math.random()*24+6,a=Math.random()*0.05+0.02;ctx.fillStyle=`rgba(0,0,0,${a})`;ctx.fillRect(x,y,w,1);}
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
    for(let x=0;x<256;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
    for(let y=0;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(8,8); return t;
}
