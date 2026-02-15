/* ============================================
   WhitWorld — Sprite System (Vector High-Fidelity)
   Procedural vector graphics for crisp, modern visuals
   ============================================ */

const Sprites = (() => {
    const cache = {};

    // Enhanced Palette
    const PAL = {
        // Ingrid (8yo girl)
        ingrid_hair: '#fcd34d',      // bright blonde
        ingrid_hair_shadow: '#d97706',
        ingrid_skin: '#fca5a5',      // warm pink skin
        ingrid_skin_shadow: '#f87171',
        ingrid_shirt: '#f472b6',     // pink
        ingrid_shirt_dark: '#db2777',
        ingrid_pants: '#60a5fa',     // blue jeans
        ingrid_pants_dark: '#2563eb',
        ingrid_shoes: '#f472b6',

        // Whit (4yo boy)
        whit_hair: '#fcd34d',
        whit_hair_shadow: '#d97706',
        whit_skin: '#fca5a5',
        whit_shirt: '#2dd4bf',       // teal
        whit_shirt_dark: '#0d9488',
        whit_pants: '#4b5563',       // gray
        whit_shoes: '#2dd4bf',

        // Common
        eye: '#1f2937',
        white: '#ffffff',
        outline: 'rgba(0,0,0,0.15)', // subtle outlines
    };

    // Helper: Draw a rounded rect
    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ------------------------------------------------------------------
    // Character Drawing Logic (Vector)
    // ------------------------------------------------------------------
    function drawCharacter(ctx, type, state, w, h) {
        const isIngrid = type === 'ingrid';
        const t = performance.now() / 1000;

        ctx.save();

        // Bobbing animation
        let bobY = 0;
        if (state.includes('run')) {
            bobY = Math.sin(t * 20) * 2;
        } else if (state === 'stand') {
            bobY = Math.sin(t * 2) * 1;
        }

        ctx.translate(w / 2, h + bobY); // Anchor at feet

        // --- LEGS ---
        const legW = w * 0.18;
        const legH = h * 0.25;
        ctx.fillStyle = isIngrid ? PAL.ingrid_pants : PAL.whit_pants;

        // Leg animation
        let lLegRot = 0, rLegRot = 0;
        if (state === 'run1') { lLegRot = -0.4; rLegRot = 0.4; }
        else if (state === 'run2') { lLegRot = 0.4; rLegRot = -0.4; }
        else if (state === 'jump') { lLegRot = -0.2; rLegRot = -0.4; }
        else if (state === 'cry') { /* knees bent */ }

        // Left Leg
        ctx.save();
        ctx.translate(-w * 0.15, -legH);
        ctx.rotate(lLegRot);
        roundRect(ctx, -legW / 2, 0, legW, legH, 4);
        ctx.fill();
        // Shoe
        ctx.fillStyle = isIngrid ? PAL.ingrid_shoes : PAL.whit_shoes;
        ctx.beginPath();
        ctx.ellipse(0, legH, legW * 0.8, legW * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right Leg
        ctx.save();
        ctx.fillStyle = isIngrid ? PAL.ingrid_pants : PAL.whit_pants;
        ctx.translate(w * 0.15, -legH);
        ctx.rotate(rLegRot);
        roundRect(ctx, -legW / 2, 0, legW, legH, 4);
        ctx.fill();
        // Shoe
        ctx.fillStyle = isIngrid ? PAL.ingrid_shoes : PAL.whit_shoes;
        ctx.beginPath();
        ctx.ellipse(0, legH, legW * 0.8, legW * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- BODY ---
        const bodyW = w * 0.45;
        const bodyH = h * 0.35;
        const bodyY = -legH - bodyH * 0.8;

        ctx.globalCompositeOperation = 'source-over'; // ensure body covers legs
        ctx.fillStyle = isIngrid ? PAL.ingrid_shirt : PAL.whit_shirt;
        roundRect(ctx, -bodyW / 2, bodyY, bodyW, bodyH, 8);
        ctx.fill();

        // Shirt detail (stripe/logo)
        ctx.fillStyle = isIngrid ? PAL.ingrid_shirt_dark : PAL.whit_shirt_dark;
        ctx.beginPath();
        ctx.arc(0, bodyY + bodyH * 0.5, bodyW * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // --- ARMS ---
        const armW = w * 0.14;
        const armH = h * 0.28;
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin : PAL.whit_skin;

        // Arm Anim
        let lArmRot = 0, rArmRot = 0;
        if (state.includes('run')) { lArmRot = rLegRot * 1.5; rArmRot = lLegRot * 1.5; }
        else if (state === 'jump') { lArmRot = -2.5; rArmRot = 2.5; } // Cheer
        else if (state === 'cry') { lArmRot = -0.5; rArmRot = 0.5; } // Hands to face

        // Left Arm (behind body? no, side view usually implies one visible or both)
        // Let's draw both on sides
        ctx.save();
        ctx.translate(-bodyW * 0.6, bodyY + bodyH * 0.2);
        ctx.rotate(lArmRot);
        roundRect(ctx, -armW / 2, 0, armW, armH, 4);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(bodyW * 0.6, bodyY + bodyH * 0.2);
        ctx.rotate(rArmRot);
        roundRect(ctx, -armW / 2, 0, armW, armH, 4);
        ctx.fill();
        ctx.restore();

        // --- HEAD ---
        const headSz = w * 0.65; // Big head
        const headY = bodyY - headSz * 0.85;

        // Neck (tiny)
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin : PAL.whit_skin;
        ctx.fillRect(-w * 0.1, bodyY - 2, w * 0.2, 5);

        // Face shape
        ctx.beginPath();
        ctx.arc(0, headY, headSz / 2, 0, Math.PI * 2);
        ctx.fill();

        // Face Shadow (chin)
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin_shadow : PAL.whit_skin_shadow;
        ctx.beginPath();
        ctx.arc(0, headY, headSz / 2, 0.5, Math.PI - 0.5);
        ctx.fill();

        // --- HAIR ---
        ctx.fillStyle = isIngrid ? PAL.ingrid_hair : PAL.whit_hair;
        ctx.beginPath();
        // Hair cap
        ctx.arc(0, headY - 2, headSz / 2 + 2, Math.PI, 0); // Top half
        ctx.lineTo(headSz / 2 + 2, headY + 10);
        ctx.lineTo(-headSz / 2 - 2, headY + 10);
        ctx.fill();

        // Bangs
        ctx.beginPath();
        ctx.arc(-headSz / 4, headY - headSz / 4, headSz / 4, 0, Math.PI * 2);
        ctx.arc(headSz / 4, headY - headSz / 4, headSz / 4, 0, Math.PI * 2);
        ctx.fill();

        if (isIngrid) {
            // Ponytail (bouncing)
            ctx.save();
            ctx.translate(-headSz * 0.6, headY - headSz * 0.3);
            const ponyRot = state.includes('run') ? Math.sin(t * 15) * 0.5 : 0;
            ctx.rotate(ponyRot);
            ctx.fillStyle = PAL.ingrid_hair;
            ctx.beginPath();
            ctx.ellipse(0, 0, headSz * 0.25, headSz * 0.5, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Tie
            ctx.fillStyle = PAL.ingrid_shirt;
            ctx.beginPath();
            ctx.arc(headSz * 0.1, headSz * 0.1, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- FACE FEATURES ---
        // Eyes
        ctx.fillStyle = PAL.eye;
        let eyeY = headY + 2;
        if (state === 'jump') eyeY -= 2;

        if (state === 'cry') {
            // Tearing up eyes
            ctx.strokeStyle = PAL.eye;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-10, eyeY); ctx.lineTo(-4, eyeY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, eyeY); ctx.lineTo(10, eyeY); ctx.stroke();
            // Tears
            ctx.fillStyle = '#60a5fa';
            ctx.beginPath(); ctx.arc(-7, eyeY + 6, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(7, eyeY + 6, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            // Normal eyes
            ctx.beginPath(); ctx.arc(-8, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();
            // Shine
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-9, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(7, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        }

        // Mouth
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin_shadow : PAL.whit_skin_shadow;
        if (state === 'happy' || state === 'jump') {
            ctx.beginPath();
            ctx.arc(0, headY + 10, 4, 0, Math.PI); // Smile
            ctx.fill();
        } else if (state === 'cry') {
            ctx.beginPath();
            ctx.arc(0, headY + 12, 4, Math.PI, 0); // Frown
            ctx.stroke();
        } else if (state === 'chase') {
            // Angry/determined mouth
            ctx.beginPath(); ctx.ellipse(0, headY + 10, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            // Neutral
            ctx.fillRect(-2, headY + 10, 4, 2);
        }

        ctx.restore();
    }

    // ------------------------------------------------------------------
    // Public Renderers
    // ------------------------------------------------------------------

    function drawIngrid(ctx, x, y, state) {
        const w = 48, h = 64;
        ctx.save();
        ctx.translate(x, y);
        drawCharacter(ctx, 'ingrid', state, w, h);
        ctx.restore();
    }

    function drawWhit(ctx, x, y, state) {
        const w = 40, h = 54;
        ctx.save();
        ctx.translate(x, y);
        drawCharacter(ctx, 'whit', state, w, h);
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // Object Renderers (Vector)
    // ------------------------------------------------------------------

    function drawWashingMachine(ctx, x, y, w, h) {
        // Body
        ctx.fillStyle = '#e4e4e7'; // White/Gray metal
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        // Shadow separation
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(x, y + h - 10, w, 10);

        // Door Outline
        ctx.fillStyle = '#a1a1aa';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Window (blue glass)
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, '#60a5fa');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Reflection
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.4, y + h * 0.4, w * 0.1, w * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // Control panel
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(x + 10, y + 5, w - 20, 15);
        // Knobs
        ctx.fillStyle = '#22c55e'; // Green LED
        ctx.beginPath(); ctx.arc(x + w - 20, y + 12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; // Red LED
        ctx.beginPath(); ctx.arc(x + w - 30, y + 12, 3, 0, Math.PI * 2); ctx.fill();
    }

    function drawBattery(ctx, x, y, w, h) {
        // Vector Battery
        ctx.fillStyle = '#22c55e'; // Green body
        roundRect(ctx, x, y + 4, w, h - 4, 2);
        ctx.fill();

        // Metal cap
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(x + w * 0.25, y, w * 0.5, 4);

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 2, y + 6, 4, h - 8);

        // Plus symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('+', x + w / 2 - 4, y + h / 2 + 4);
    }

    function drawToy(ctx, x, y, w, h, color) {
        ctx.fillStyle = color || '#ef4444';
        // Lego-like block
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        // Studs
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.arc(x + w * 0.25, y + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * 0.75, y + 2, 3, 0, Math.PI * 2); ctx.fill();
    }

    function drawSoccerBall(ctx, x, y, size) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Pentagons
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 5, 0, Math.PI * 2);
        ctx.fill();
        // Patches
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + size / 2 + Math.cos(ang) * size * 0.35, y + size / 2 + Math.sin(ang) * size * 0.35, size / 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCouch(ctx, x, y, w, h) {
        ctx.fillStyle = '#92400e';
        roundRect(ctx, x, y + h / 2, w, h / 2, 4); // Base
        ctx.fill();
        roundRect(ctx, x, y, w, h / 2 + 5, 6); // Back
        ctx.fill();
        // Cushions
        ctx.fillStyle = '#b45309';
        roundRect(ctx, x + 5, y + h * 0.4, (w - 10) / 2 - 2, h * 0.4, 3);
        ctx.fill();
        roundRect(ctx, x + 5 + (w - 10) / 2 + 2, y + h * 0.4, (w - 10) / 2 - 2, h * 0.4, 3);
        ctx.fill();
    }

    function drawCooler(ctx, x, y, w, h) {
        ctx.fillStyle = '#2563eb';
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y + 10, w, 4); // stripe
    }

    function drawGuitar(ctx, x, y, w, h) {
        // Body
        ctx.fillStyle = '#b45309'; // Wood
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.7, w * 0.4, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.45, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Neck
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + w * 0.45, y, w * 0.1, h * 0.6);
    }

    function drawBatteryDrawer(ctx, x, y, w, h) {
        ctx.fillStyle = '#a16207'; // Wood
        ctx.fillRect(x, y, w, h);
        // Drawers
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(x + 2, y + 2, w - 4, h / 3 - 4);
        ctx.fillRect(x + 2, y + h / 3 + 2, w - 4, h / 3 - 4);
        ctx.fillRect(x + 2, y + 2 * h / 3 + 2, w - 4, h / 3 - 4);
        // Knobs
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 6, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, y + 5 * h / 6, 3, 0, Math.PI * 2); ctx.fill();
    }

    function drawLaundryPile(ctx, x, y, w, h) {
        const colors = ['#f87171', '#60a5fa', '#34d399'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = colors[i % 3];
            ctx.beginPath();
            ctx.ellipse(x + w / 2 + (Math.random() - 0.5) * 10, y + h / 2 + (Math.random() - 0.5) * 10, 8, 5, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function clearCache() {
        for (const key in cache) delete cache[key];
    }

    return {
        drawIngrid,
        drawWhit,
        drawWashingMachine,
        drawBattery,
        drawToy,
        drawSoccerBall,
        drawCouch,
        drawCooler,
        drawGuitar,
        drawBatteryDrawer,
        drawLaundryPile,
        clearCache,
        PAL
    };

})();
