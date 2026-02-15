/* ============================================
   WhitWorld — Sprite System (Cozy Ghibli Style)
   Warm, rounded, Totoro-inspired vector art
   Soft lighting, expressive eyes, natural movement
   ============================================ */

const Sprites = (() => {
    const cache = {};

    // Ghibli-inspired warm palette
    const PAL = {
        // Ingrid (8yo girl)
        ingrid_hair: '#f0c040',
        ingrid_hair_light: '#f8d868',
        ingrid_hair_shadow: '#d4960c',
        ingrid_skin: '#fce0c8',
        ingrid_skin_shadow: '#e8b890',
        ingrid_skin_blush: 'rgba(230,130,110,0.35)',
        ingrid_shirt: '#e87098',
        ingrid_shirt_dark: '#c85078',
        ingrid_shirt_light: '#f090b0',
        ingrid_pants: '#5888c8',
        ingrid_pants_dark: '#4070a8',
        ingrid_shoes: '#c85078',
        ingrid_ribbon: '#e85888',

        // Whit (4yo boy)
        whit_hair: '#f0c040',
        whit_hair_light: '#f8d868',
        whit_hair_shadow: '#d4960c',
        whit_skin: '#fce0c8',
        whit_skin_shadow: '#e8b890',
        whit_skin_blush: 'rgba(230,130,110,0.35)',
        whit_shirt: '#48c0a8',
        whit_shirt_dark: '#309888',
        whit_shirt_light: '#68d8c0',
        whit_pants: '#6878a0',
        whit_shoes: '#38a890',

        // Common
        eye_dark: '#2a1a10',
        eye_shine: '#ffffff',
        eye_shine2: 'rgba(255,255,255,0.5)',
        mouth: '#c08060',
        mouth_happy: '#b06848',
        tear: '#80b8e8',

        // Environment
        floor: '#c8a868',
        floor_edge: '#a88848',
        shelf_wood: '#8a7050',
        shelf_light: '#9a8060',
    };

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
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

    // Soft ellipse with highlight (Ghibli shading)
    function softEllipse(ctx, cx, cy, rx, ry, fill, highlight) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (highlight) {
            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.ellipse(cx - rx * 0.15, cy - ry * 0.2, rx * 0.5, ry * 0.4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Ghibli-style eye with double highlight
    function drawGhibliEye(ctx, cx, cy, r, isClosedOrCrying) {
        if (isClosedOrCrying === 'cry') {
            // Squinting tearful eyes
            ctx.strokeStyle = PAL.eye_dark;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.quadraticCurveTo(cx, cy + r * 0.6, cx + r, cy);
            ctx.stroke();
            // Tear
            ctx.fillStyle = PAL.tear;
            ctx.beginPath();
            ctx.ellipse(cx, cy + r * 1.8, r * 0.45, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tear shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.ellipse(cx - r * 0.15, cy + r * 1.4, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        if (isClosedOrCrying === 'blink') {
            ctx.strokeStyle = PAL.eye_dark;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.lineTo(cx + r, cy);
            ctx.stroke();
            return;
        }

        // Main iris
        ctx.fillStyle = PAL.eye_dark;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Large shine (top-left)
        ctx.fillStyle = PAL.eye_shine;
        ctx.beginPath();
        ctx.ellipse(cx + r * 0.25, cy - r * 0.25, r * 0.4, r * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Small shine (bottom-right) — the Ghibli double-highlight
        ctx.fillStyle = PAL.eye_shine2;
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.3, cy + r * 0.35, r * 0.2, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ghibli mouth variations
    function drawMouth(ctx, cx, cy, state, scale) {
        const s = scale || 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (state === 'happy' || state === 'jump') {
            // Big open smile
            ctx.fillStyle = PAL.mouth_happy;
            ctx.beginPath();
            ctx.arc(cx, cy, 4 * s, 0, Math.PI);
            ctx.fill();
            // Tongue hint
            ctx.fillStyle = '#d07060';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (state === 'cry') {
            // Wide open wail
            ctx.fillStyle = PAL.mouth;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 1 * s, 3.5 * s, 4 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#a06050';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (state === 'chase') {
            // Determined grin
            ctx.fillStyle = PAL.mouth;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 3 * s, 2 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Gentle closed smile — the classic Ghibli curve
            ctx.strokeStyle = PAL.mouth;
            ctx.lineWidth = 1.3 * s;
            ctx.beginPath();
            ctx.moveTo(cx - 3 * s, cy);
            ctx.quadraticCurveTo(cx, cy + 4 * s, cx + 3 * s, cy);
            ctx.stroke();
        }
    }

    // ----------------------------------------------------------------
    // Held Guitar (toy guitar with flashing lights)
    // ----------------------------------------------------------------
    function drawHeldGuitar(ctx, x, y) {
        const t = performance.now();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.5);

        // Body — warm wood
        ctx.fillStyle = '#e8a020';
        ctx.beginPath();
        ctx.ellipse(10, 5, 13, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, -2, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sound hole
        ctx.fillStyle = '#a07010';
        ctx.beginPath();
        ctx.ellipse(10, 3, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = '#a07018';
        ctx.fillRect(-12, -4, 22, 5);

        // Headstock
        ctx.fillStyle = '#e8a020';
        roundRect(ctx, -16, -6, 7, 8, 2);
        ctx.fill();

        // Flashing lights
        const flash1 = Math.sin(t * 0.01) > 0 ? '#ef4444' : '#fecaca';
        const flash2 = Math.sin(t * 0.01 + 2) > 0 ? '#3b82f6' : '#bfdbfe';
        ctx.fillStyle = flash1;
        ctx.beginPath(); ctx.arc(8, 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = flash2;
        ctx.beginPath(); ctx.arc(14, 1, 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ----------------------------------------------------------------
    // CHARACTER DRAWING — Ghibli Style
    // ----------------------------------------------------------------
    function drawCharacter(ctx, type, state, w, h, holding) {
        const isIngrid = type === 'ingrid';
        const t = performance.now() / 1000;

        ctx.save();

        // Gentle breathing/bobbing
        let bobY = 0;
        if (state.includes('run')) {
            bobY = Math.sin(t * 18) * 2;
        } else if (state === 'stand') {
            bobY = Math.sin(t * 1.8) * 1.2;
        } else if (state === 'cry') {
            bobY = Math.sin(t * 6) * 1.5; // Sobbing bob
        }

        ctx.translate(w / 2, h + bobY);

        // ---- LEGS ----
        const legW = w * 0.17;
        const legH = h * 0.24;

        let lLegRot = 0, rLegRot = 0;
        if (state === 'run1') { lLegRot = -0.45; rLegRot = 0.45; }
        else if (state === 'run2') { lLegRot = 0.45; rLegRot = -0.45; }
        else if (state === 'jump') { lLegRot = -0.25; rLegRot = -0.45; }

        // Left leg
        ctx.save();
        ctx.translate(-w * 0.14, -legH);
        ctx.rotate(lLegRot);
        ctx.fillStyle = isIngrid ? PAL.ingrid_pants : PAL.whit_pants;
        roundRect(ctx, -legW / 2, 0, legW, legH, 5);
        ctx.fill();
        // Shoe — rounded, Ghibli-soft
        ctx.fillStyle = isIngrid ? PAL.ingrid_shoes : PAL.whit_shoes;
        ctx.beginPath();
        ctx.ellipse(1, legH, legW * 0.9, legW * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right leg
        ctx.save();
        ctx.translate(w * 0.14, -legH);
        ctx.rotate(rLegRot);
        ctx.fillStyle = isIngrid ? PAL.ingrid_pants : PAL.whit_pants;
        roundRect(ctx, -legW / 2, 0, legW, legH, 5);
        ctx.fill();
        ctx.fillStyle = isIngrid ? PAL.ingrid_shoes : PAL.whit_shoes;
        ctx.beginPath();
        ctx.ellipse(1, legH, legW * 0.9, legW * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ---- BODY ----
        const bodyW = w * 0.48;
        const bodyH = h * 0.34;
        const bodyY = -legH - bodyH * 0.78;

        // Body shape — soft, rounded, slightly dress-like
        ctx.fillStyle = isIngrid ? PAL.ingrid_shirt : PAL.whit_shirt;
        ctx.beginPath();
        ctx.moveTo(-bodyW * 0.4, bodyY);
        ctx.quadraticCurveTo(-bodyW * 0.55, bodyY + bodyH * 0.3, -bodyW * 0.5, bodyY + bodyH);
        ctx.lineTo(bodyW * 0.5, bodyY + bodyH);
        ctx.quadraticCurveTo(bodyW * 0.55, bodyY + bodyH * 0.3, bodyW * 0.4, bodyY);
        ctx.closePath();
        ctx.fill();

        // Body highlight — soft ambient light from left
        ctx.fillStyle = isIngrid ? PAL.ingrid_shirt_light : PAL.whit_shirt_light;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(-bodyW * 0.15, bodyY + bodyH * 0.35, bodyW * 0.2, bodyH * 0.35, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Circle detail on body
        ctx.fillStyle = isIngrid ? PAL.ingrid_shirt_dark : PAL.whit_shirt_dark;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(0, bodyY + bodyH * 0.55, bodyW * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ---- HEAD calculations ----
        const headR = w * 0.35;
        const headY = bodyY - headR * 0.55 + 2;

        // ---- ARMS ----
        const armW = w * 0.13;
        const armH = h * 0.26;

        let lArmRot = 0, rArmRot = 0;
        if (holding === 'guitar') {
            lArmRot = -0.8; rArmRot = -1.2;
        } else if (state.includes('run')) {
            lArmRot = rLegRot * 1.3; rArmRot = lLegRot * 1.3;
        } else if (state === 'jump') {
            lArmRot = -2.2; rArmRot = 2.2;
        } else if (state === 'cry') {
            lArmRot = -1.0; rArmRot = 1.0; // Hands toward face
        } else if (state === 'chase') {
            lArmRot = Math.sin(t * 12) * 0.6;
            rArmRot = -Math.sin(t * 12) * 0.6;
        }

        // Left arm
        ctx.save();
        ctx.translate(-bodyW * 0.55, bodyY + bodyH * 0.18);
        ctx.rotate(lArmRot);
        // Arm shape — soft rounded
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin : PAL.whit_skin;
        ctx.beginPath();
        ctx.ellipse(0, armH * 0.5, armW * 0.55, armH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hand — little circle
        ctx.beginPath();
        ctx.arc(0, armH * 0.85, armW * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Guitar (drawn between arms)
        if (holding === 'guitar') {
            drawHeldGuitar(ctx, 0, bodyY + bodyH * 0.6);
        }

        // Right arm
        ctx.save();
        ctx.translate(bodyW * 0.55, bodyY + bodyH * 0.18);
        ctx.rotate(rArmRot);
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin : PAL.whit_skin;
        ctx.beginPath();
        ctx.ellipse(0, armH * 0.5, armW * 0.55, armH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, armH * 0.85, armW * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ---- HAIR BACK (behind head) ----
        ctx.fillStyle = isIngrid ? PAL.ingrid_hair : PAL.whit_hair;
        ctx.beginPath();
        ctx.arc(0, headY - 1, headR + 3, Math.PI * 1.1, Math.PI * -0.1);
        ctx.lineTo(headR + 3, headY + headR * 0.3);
        ctx.lineTo(-headR - 3, headY + headR * 0.3);
        ctx.fill();

        // Ponytail (Ingrid only) — bouncy, natural sway
        if (isIngrid) {
            ctx.save();
            const ponyBaseX = -headR * 0.65;
            const ponyBaseY = headY - headR * 0.3;
            const ponySway = state.includes('run') ? Math.sin(t * 14) * 0.5 : Math.sin(t * 2) * 0.1;
            ctx.translate(ponyBaseX, ponyBaseY);
            ctx.rotate(ponySway + 0.3);

            // Main ponytail shape
            ctx.fillStyle = PAL.ingrid_hair;
            ctx.beginPath();
            ctx.ellipse(0, 0, headR * 0.28, headR * 0.6, 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Ponytail highlight
            ctx.fillStyle = PAL.ingrid_hair_light;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.ellipse(-headR * 0.05, -headR * 0.15, headR * 0.1, headR * 0.25, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Hair tie / ribbon
            ctx.fillStyle = PAL.ingrid_ribbon;
            ctx.beginPath();
            ctx.arc(headR * 0.12, headR * 0.15, 4, 0, Math.PI * 2);
            ctx.fill();
            // Ribbon tails
            ctx.strokeStyle = PAL.ingrid_ribbon;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(headR * 0.12, headR * 0.19);
            ctx.quadraticCurveTo(headR * 0.2, headR * 0.35 + ponySway * 3, headR * 0.08, headR * 0.45);
            ctx.stroke();

            ctx.restore();
        }

        // ---- NECK ----
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin : PAL.whit_skin;
        ctx.fillRect(-w * 0.08, bodyY - 1, w * 0.16, 4);

        // ---- HEAD ----
        // Main face — smooth circle
        softEllipse(ctx, 0, headY, headR, headR * 1.02,
            isIngrid ? PAL.ingrid_skin : PAL.whit_skin);

        // Chin shadow — soft crescent
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin_shadow : PAL.whit_skin_shadow;
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0.4, Math.PI - 0.4);
        ctx.fill();

        // Cheek blush — soft circles (very Totoro)
        const blushColor = isIngrid ? PAL.ingrid_skin_blush : PAL.whit_skin_blush;
        ctx.fillStyle = blushColor;
        ctx.beginPath();
        ctx.ellipse(-headR * 0.6, headY + headR * 0.3, headR * 0.25, headR * 0.15, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headR * 0.6, headY + headR * 0.3, headR * 0.25, headR * 0.15, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // ---- BANGS (front hair) ----
        ctx.fillStyle = isIngrid ? PAL.ingrid_hair : PAL.whit_hair;
        // Chunky rounded bangs — overlapping circles
        const bangY = headY - headR * 0.35;
        ctx.beginPath();
        ctx.arc(-headR * 0.35, bangY, headR * 0.32, 0, Math.PI * 2);
        ctx.arc(0, bangY - headR * 0.05, headR * 0.3, 0, Math.PI * 2);
        ctx.arc(headR * 0.35, bangY, headR * 0.32, 0, Math.PI * 2);
        ctx.fill();

        // Hair highlight — warm light
        ctx.fillStyle = PAL.ingrid_hair_light;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(-headR * 0.1, bangY - headR * 0.1, headR * 0.25, headR * 0.15, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ---- EYES ----
        const eyeY = headY + headR * 0.05;
        const eyeSpacing = headR * 0.48;
        const eyeR = headR * 0.2;

        // Blink timing
        const blinkCycle = (t * 1.3) % 5;
        const isBlinking = blinkCycle > 4.85;

        const eyeState = state === 'cry' ? 'cry' : (isBlinking ? 'blink' : 'open');

        if (state === 'jump') {
            // Excited wide eyes — slightly larger
            drawGhibliEye(ctx, -eyeSpacing, eyeY - 2, eyeR * 1.15, 'open');
            drawGhibliEye(ctx, eyeSpacing, eyeY - 2, eyeR * 1.15, 'open');
        } else {
            drawGhibliEye(ctx, -eyeSpacing, eyeY, eyeR, eyeState);
            drawGhibliEye(ctx, eyeSpacing, eyeY, eyeR, eyeState);
        }

        // ---- TINY NOSE ----
        ctx.fillStyle = isIngrid ? PAL.ingrid_skin_shadow : PAL.whit_skin_shadow;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(0, headY + headR * 0.35, headR * 0.08, headR * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ---- MOUTH ----
        const mouthY = headY + headR * 0.52;
        const mouthScale = isIngrid ? 1.0 : 0.85;
        drawMouth(ctx, 0, mouthY, state, mouthScale);

        ctx.restore();
    }

    // ----------------------------------------------------------------
    // Public character renderers
    // ----------------------------------------------------------------
    function drawIngrid(ctx, x, y, state, holding) {
        const w = 48, h = 64;
        ctx.save();
        ctx.translate(x, y);
        drawCharacter(ctx, 'ingrid', state, w, h, holding);
        ctx.restore();
    }

    function drawWhit(ctx, x, y, state) {
        const w = 40, h = 54;
        ctx.save();
        ctx.translate(x, y);
        drawCharacter(ctx, 'whit', state, w, h);
        ctx.restore();
    }

    // ----------------------------------------------------------------
    // OBJECT RENDERERS — Ghibli warm style
    // ----------------------------------------------------------------

    function drawWashingMachine(ctx, x, y, w, h) {
        // Soft rounded body
        ctx.fillStyle = '#d8d4cc';
        roundRect(ctx, x, y, w, h, 8);
        ctx.fill();

        // Warm highlight
        ctx.fillStyle = 'rgba(255,240,220,0.15)';
        roundRect(ctx, x + 2, y + 2, w * 0.4, h * 0.6, 6);
        ctx.fill();

        // Bottom shadow
        ctx.fillStyle = '#b8b0a8';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + h);
        ctx.lineTo(x + w - 6, y + h);
        ctx.lineTo(x + w - 2, y + h - 8);
        ctx.lineTo(x + 2, y + h - 8);
        ctx.fill();

        // Door ring
        ctx.fillStyle = '#a0988c';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 + 4, w * 0.36, 0, Math.PI * 2);
        ctx.fill();

        // Window — blue-green glass with gradient
        const grad = ctx.createRadialGradient(
            x + w / 2, y + h / 2 + 4, 0,
            x + w / 2, y + h / 2 + 4, w * 0.3
        );
        grad.addColorStop(0, '#88b8d0');
        grad.addColorStop(1, '#5890a8');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 + 4, w * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Glass reflection — Ghibli shine
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.38, y + h * 0.42, w * 0.1, w * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // Control panel
        ctx.fillStyle = '#e8e0d8';
        roundRect(ctx, x + 8, y + 4, w - 16, 14, 4);
        ctx.fill();
        // LEDs — warm glow
        ctx.fillStyle = '#68c880';
        ctx.beginPath(); ctx.arc(x + w - 18, y + 11, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e86050';
        ctx.beginPath(); ctx.arc(x + w - 28, y + 11, 3, 0, Math.PI * 2); ctx.fill();
    }

    function drawBattery(ctx, x, y, w, h) {
        // Rounded green body
        ctx.fillStyle = '#58c070';
        roundRect(ctx, x, y + 4, w, h - 4, 4);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 2, y + 6, 3, h - 8);

        // Metal cap
        ctx.fillStyle = '#a0a098';
        roundRect(ctx, x + w * 0.2, y, w * 0.6, 5, 2);
        ctx.fill();

        // Plus symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('+', x + w / 2 - 4, y + h / 2 + 5);
    }

    function drawToy(ctx, x, y, w, h, color) {
        // Rounded block toy
        ctx.fillStyle = color || '#ef4444';
        roundRect(ctx, x, y, w, h, 5);
        ctx.fill();
        // Soft highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(ctx, x + 2, y + 1, w * 0.4, h * 0.5, 3);
        ctx.fill();
        // Studs
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.arc(x + w * 0.3, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * 0.7, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    function drawSoccerBall(ctx, x, y, size) {
        // Warm orange ball
        const cx = x + size / 2, cy = y + size / 2, r = size / 2;
        const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
        grad.addColorStop(0, '#f8a030');
        grad.addColorStop(1, '#d07818');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Pentagon pattern
        ctx.fillStyle = 'rgba(160,80,10,0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2 - 0.3;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * r * 0.6, cy + Math.sin(ang) * r * 0.6, r * 0.18, 0, Math.PI * 2);
            ctx.fill();
        }
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.25, cy - r * 0.25, r * 0.2, r * 0.12, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawCouch(ctx, x, y, w, h) {
        // Warm brown with soft shape
        ctx.fillStyle = '#906830';
        roundRect(ctx, x, y + h * 0.35, w, h * 0.65, 6);
        ctx.fill();
        // Back
        ctx.fillStyle = '#805828';
        roundRect(ctx, x + 2, y, w - 4, h * 0.5, 8);
        ctx.fill();
        // Cushions
        ctx.fillStyle = '#a07838';
        roundRect(ctx, x + 6, y + h * 0.4, (w - 14) / 2, h * 0.4, 5);
        ctx.fill();
        roundRect(ctx, x + 8 + (w - 14) / 2, y + h * 0.4, (w - 14) / 2, h * 0.4, 5);
        ctx.fill();
        // Warm highlight
        ctx.fillStyle = 'rgba(255,240,200,0.08)';
        roundRect(ctx, x + 6, y + h * 0.4, (w - 14) / 2 - 4, h * 0.25, 4);
        ctx.fill();
    }

    function drawCooler(ctx, x, y, w, h) {
        ctx.fillStyle = '#4080d0';
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        // Lid
        ctx.fillStyle = '#3870b8';
        roundRect(ctx, x - 1, y, w + 2, h * 0.3, 4);
        ctx.fill();
        // White stripe
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(x + 2, y + h * 0.3, w - 4, 4);
        // Handle
        ctx.fillStyle = '#2860a0';
        roundRect(ctx, x + w * 0.3, y - 3, w * 0.4, 5, 2);
        ctx.fill();
    }

    function drawGuitar(ctx, x, y, w, h) {
        // Warm wood body
        ctx.fillStyle = '#b86820';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.7, w * 0.42, h * 0.27, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.43, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sound hole
        ctx.fillStyle = '#704010';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.65, w * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Neck
        ctx.fillStyle = '#886018';
        ctx.fillRect(x + w * 0.44, y, w * 0.12, h * 0.6);
        // Highlight
        ctx.fillStyle = 'rgba(255,240,200,0.15)';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.38, y + h * 0.6, w * 0.12, h * 0.1, -0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBatteryDrawer(ctx, x, y, w, h) {
        // Warm wooden dresser
        ctx.fillStyle = '#907040';
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        // Drawers
        const dh = h / 3 - 3;
        for (let i = 0; i < 3; i++) {
            const dy = y + 2 + i * (h / 3);
            ctx.fillStyle = '#a88050';
            roundRect(ctx, x + 3, dy, w - 6, dh, 3);
            ctx.fill();
            // Knob
            ctx.fillStyle = '#d8b870';
            ctx.beginPath();
            ctx.arc(x + w / 2, dy + dh / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // Top highlight
        ctx.fillStyle = 'rgba(255,240,200,0.1)';
        ctx.fillRect(x + 3, y + 2, w * 0.35, h * 0.15);
    }

    function drawLaundryPile(ctx, x, y, w, h) {
        // Soft colorful fabric pile
        const colors = ['#e87070', '#70a0e0', '#58c890', '#e0a050', '#c080d0'];
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = colors[i % colors.length];
            const ox = (Math.sin(i * 2.3) * 0.3) * w;
            const oy = (Math.cos(i * 1.7) * 0.3) * h;
            ctx.beginPath();
            ctx.ellipse(
                x + w / 2 + ox, y + h / 2 + oy,
                w * 0.2 + Math.sin(i) * 3, h * 0.15 + Math.cos(i) * 2,
                i * 0.8, 0, Math.PI * 2
            );
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
