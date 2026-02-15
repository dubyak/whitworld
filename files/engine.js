/* ============================================
   WhitWorld — Game Engine (Ghibli Background Update)
   Main game loop, rendering, state management
   Warm atmospheric backgrounds with depth and light
   ============================================ */

const GameEngine = (() => {
    let canvas, ctx;
    let gameState = 'title'; // title, select, playing, paused, win, lose
    let level = null;
    let player = null;
    let cameraX = 0;
    let cameraY = 0;
    let currentChallenge = 1;
    let difficulty = 'normal';
    let timer = 0;
    let timerActive = false;
    let score = 0;
    let lastTime = 0;
    let animFrameId = null;
    let rollingObstacles = [];
    let rollingTimer = 0;
    let particles = [];
    let shakeAmount = 0;
    let dialogQueue = [];
    let introPlayed = false;
    let catchCount = 0;
    let beatPulse = 0;

    // Background decoration — dust motes with depth layers
    let dustMotes = [];

    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Generate layered dust motes (Ghibli floating particles)
        for (let i = 0; i < 80; i++) {
            dustMotes.push({
                x: Math.random() * 3000,
                y: Math.random() * 500,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 0.15 + 0.02,
                drift: Math.random() * 0.3 + 0.1,       // horizontal drift
                phase: Math.random() * Math.PI * 2,
                layer: Math.random(),                     // 0=far, 1=near
                brightness: Math.random() * 0.3 + 0.1,
            });
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function startLevel(challengeNum, diff) {
        currentChallenge = challengeNum;
        difficulty = diff || difficulty;
        level = Levels.create(challengeNum, canvas.height, difficulty);

        player = new Player(level.playerStart.x, level.playerStart.y);
        player.lives = level.lives || 3;
        player.invincible = true;
        player.invincibleTimer = 2000;
        if (level.startHolding) {
            player.holding = level.startHolding;
        }

        cameraX = 0;
        cameraY = 0;
        timer = level.timer || 0;
        timerActive = !!level.timer;
        score = 0;
        rollingObstacles = [];
        rollingTimer = 0;
        particles = [];
        shakeAmount = 0;
        catchCount = 0;
        introPlayed = false;

        gameState = 'playing';
        canvas.classList.add('active');

        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('hud-challenge-name').textContent = level.name;
        updateHUD();

        if (InputSystem.getIsMobile()) {
            InputSystem.showTouchControls();
        }

        if (!AudioSystem.isPlaying) {
            AudioSystem.startMusic();
        }

        setTimeout(() => {
            if (challengeNum === 1) {
                showToast("Navigate the basement! Get to Whit! ➡️");
            } else {
                showToast("Get to the kitchen for batteries! 🔋");
            }
            introPlayed = true;
        }, 500);

        lastTime = performance.now();
        if (animFrameId) cancelAnimationFrame(animFrameId);
        gameLoop(lastTime);
    }

    function gameLoop(timestamp) {
        const dt = Math.min(timestamp - lastTime, 33);
        lastTime = timestamp;

        if (gameState === 'playing') {
            update(dt);
            render();
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        if (InputSystem.wasJustPressed('pause')) {
            pauseGame();
            return;
        }

        player.update(dt, level.platforms, difficulty);
        player.canInteract = false;
        player.interactTarget = null;

        // Camera follow (horizontal)
        const targetCamX = player.x - canvas.width * 0.35;
        cameraX += (targetCamX - cameraX) * 0.08;
        cameraX = Math.max(0, Math.min(cameraX, level.width - canvas.width));

        // Camera follow (vertical)
        const playerScreenY = player.y - cameraY;
        const camDeadzone = canvas.height * 0.55;
        if (playerScreenY > camDeadzone) {
            const targetCamY = player.y - camDeadzone;
            cameraY += (targetCamY - cameraY) * 0.1;
        } else if (playerScreenY < canvas.height * 0.25 && cameraY > 0) {
            const targetCamY = Math.max(0, player.y - canvas.height * 0.25);
            cameraY += (targetCamY - cameraY) * 0.1;
        }
        if (cameraY < 0) cameraY = 0;

        // Keep player in bounds
        if (player.x < 0) player.x = 0;
        if (player.x > level.width - player.w) player.x = level.width - player.w;
        if (player.y > canvas.height + 100) {
            const died = player.takeDamage();
            if (died) {
                loseGame();
                return;
            }
            player.x = level.playerStart.x;
            player.y = level.playerStart.y;
            player.vx = 0;
            player.vy = 0;
        }

        // Timer
        if (timerActive) {
            timer -= dt / 1000;
            if (timer <= 0) {
                timer = 0;
                loseGame();
                return;
            }
            updateTimerDisplay();
        }

        // Update obstacles
        for (const obs of level.obstacles) {
            obs.update(dt);
            if (obs.harmful && obs.active && player.collidesWith(obs)) {
                const died = player.takeDamage();
                if (died) {
                    loseGame();
                    return;
                }
                player.vx = -player.facing * 5;
                player.vy = -3;
                shakeAmount = 5;
                addParticles(player.x, player.y, '#ff6b9d', 8);
            }
        }

        // Rolling obstacles
        if (level.rollingInterval) {
            rollingTimer += dt;
            if (rollingTimer >= level.rollingInterval) {
                rollingTimer = 0;
                const spawnX = cameraX + canvas.width + 50;
                if (spawnX < level.width - 300) {
                    const groundY = canvas.height - 60;
                    rollingObstacles.push(
                        new RollingObstacle(spawnX, groundY - 30, 30, level.rollingSpeed, 'soccer')
                    );
                }
            }
        }

        for (let i = rollingObstacles.length - 1; i >= 0; i--) {
            rollingObstacles[i].update(dt);
            if (player.collidesWith(rollingObstacles[i])) {
                const died = player.takeDamage();
                if (died) {
                    loseGame();
                    return;
                }
                player.vy = -5;
                shakeAmount = 5;
                addParticles(player.x, player.y, '#f97316', 6);
                rollingObstacles.splice(i, 1);
                continue;
            }
            if (rollingObstacles[i].x < cameraX - 100) {
                rollingObstacles.splice(i, 1);
            }
        }

        // Update collectibles
        for (const item of level.collectibles) {
            if (!item.collected) {
                item.update(dt);
                if (player.collidesWith(item)) {
                    item.collected = true;
                    AudioSystem.playSFX('collect');
                    addParticles(item.x, item.y, '#ffe66d', 10);
                    if (item.type === 'star') {
                        score += 100;
                    } else if (item.type === 'heart') {
                        player.lives = Math.min(player.lives + 1, 5);
                        showToast("Extra life! ❤️");
                    } else if (item.type === 'battery') {
                        player.carrying = 'battery';
                        showToast("Got batteries! Find the guitar! 🔋");
                    }
                }
            }
        }

        // Update interaction zones
        for (const zone of level.interactionZones) {
            zone.update(dt, player);
            if (player.canInteract && player.interactTarget === zone) {
                if (InputSystem.wasJustPressed('interact')) {
                    if (zone.type === 'battery_drawer' && !player.carrying) {
                        showToast("Need batteries first! 🔋");
                        AudioSystem.playSFX('bump');
                    } else {
                        const result = zone.interact(player);
                        if (result === 'win') {
                            AudioSystem.playSFX('interact');
                            setTimeout(() => winGame(), 1000);
                        }
                    }
                }
            }
        }

        // Update NPCs
        for (const npc of level.npcs) {
            const result = npc.update(dt, player, level.platforms);
            if (result === 'caught') {
                catchCount++;
                shakeAmount = 8;
                addParticles(player.x, player.y, '#ef4444', 12);
                if (catchCount >= (level.maxCatches || 3)) {
                    loseGame();
                    return;
                }
                player.vx = -player.facing * 8;
                player.vy = -4;
                updateHUD();
                showToast(`Caught! ${level.maxCatches - catchCount} chances left! 😬`);
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].life -= dt;
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].vy += 0.1;
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        if (shakeAmount > 0) {
            shakeAmount *= 0.9;
            if (shakeAmount < 0.5) shakeAmount = 0;
        }

        if (beatPulse > 0) {
            beatPulse *= 0.92;
            if (beatPulse < 0.01) beatPulse = 0;
        }

        updateHUD();
        InputSystem.clearJustPressed();
    }

    function render() {
        ctx.save();

        if (shakeAmount > 0) {
            ctx.translate(
                (Math.random() - 0.5) * shakeAmount * 2,
                (Math.random() - 0.5) * shakeAmount * 2
            );
        }

        ctx.translate(0, -cameraY);

        drawBackground();

        for (const plat of level.platforms) {
            plat.draw(ctx, cameraX);
        }

        for (const obs of level.obstacles) {
            if (obs.active) obs.draw(ctx, cameraX);
        }

        for (const roll of rollingObstacles) {
            roll.draw(ctx, cameraX);
        }

        for (const item of level.collectibles) {
            item.draw(ctx, cameraX);
        }

        for (const zone of level.interactionZones) {
            zone.draw(ctx, cameraX);
        }

        for (const npc of level.npcs) {
            npc.draw(ctx, cameraX);
        }

        player.draw(ctx, cameraX);

        // Particles
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Foreground dust layer (drawn over everything for depth)
        drawForegroundDust();

        // Catch counter for challenge 2
        if (level.maxCatches) {
            ctx.save();
            ctx.translate(0, cameraY);
            drawCatchCounter();
            ctx.restore();
        }

        ctx.restore();
    }

    // ================================================================
    // GHIBLI BACKGROUND SYSTEM
    // ================================================================

    function drawBackground() {
        const time = performance.now() / 1000;
        const theme = level.theme || 'basement';

        // Base gradient — warm dark tones
        const grad = ctx.createLinearGradient(0, cameraY, 0, cameraY + canvas.height);
        grad.addColorStop(0, level.bgColor);
        grad.addColorStop(1, level.bgAccent);
        ctx.fillStyle = grad;
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        if (theme === 'basement') {
            drawBasementBG(time);
        } else if (theme === 'house') {
            drawHouseBG(time);
        }

        // Atmospheric colored lights — warm, soft, reactive to beat
        drawAmbientLights(time);
    }

    function drawBasementBG(time) {
        const parallax = cameraX * 0.15;
        const wallBottom = canvas.height - 60;

        // ---- WALL TEXTURE ----
        // Warm dark concrete with subtle brick hints
        const wallGrad = ctx.createLinearGradient(0, 0, 0, wallBottom);
        wallGrad.addColorStop(0, '#201820');
        wallGrad.addColorStop(0.5, '#2a2028');
        wallGrad.addColorStop(1, '#302530');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, cameraY, canvas.width, wallBottom + 500);

        // Soft brick pattern — barely visible, atmospheric
        ctx.fillStyle = 'rgba(50, 35, 45, 0.3)';
        for (let y = -20; y < wallBottom + 200; y += 42) {
            const offset = (y / 42) % 2 === 0 ? 0 : 42;
            for (let x = -parallax * 0.2 % 84 + offset - 84; x < canvas.width + 84; x += 84) {
                if (cameraY + canvas.height > y && cameraY < y + 38) {
                    ctx.beginPath();
                    ctx.roundRect(x, y, 80, 38, 2);
                    ctx.fill();
                }
            }
        }

        // ---- PIPES ----
        // Main horizontal pipe — warm metallic
        ctx.strokeStyle = '#3a3048';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 38);
        ctx.lineTo(canvas.width, 38);
        ctx.stroke();
        // Pipe highlight
        ctx.strokeStyle = '#4a4058';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 34);
        ctx.lineTo(canvas.width, 34);
        ctx.stroke();

        // Vertical pipes with joints
        for (let i = 0; i < 5; i++) {
            const px = ((i * 520 + 180) - parallax * 0.8) % (canvas.width + 550) - 275;
            if (px > -50 && px < canvas.width + 50) {
                ctx.strokeStyle = '#353040';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(px, 32);
                ctx.lineTo(px, wallBottom - 40);
                ctx.stroke();
                // Joint
                ctx.fillStyle = '#454058';
                ctx.beginPath();
                ctx.roundRect(px - 5, 130, 10, 16, 3);
                ctx.fill();
                // Drip (occasional)
                if (i % 3 === 0) {
                    const dripY = 148 + Math.sin(time * 0.5 + i) * 2;
                    ctx.fillStyle = 'rgba(100,160,200,0.2)';
                    ctx.beginPath();
                    ctx.ellipse(px, dripY, 2, 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ---- WINDOW WITH WARM LIGHT ----
        // This is the key Ghibli element — warm light pouring into dark space
        for (let wi = 0; wi < 2; wi++) {
            const winX = ((wi * 900 + 250 - parallax * 0.12) % (canvas.width + 500) + canvas.width + 500) % (canvas.width + 500) - 250;
            if (winX > -120 && winX < canvas.width + 120) {
                // Window frame
                ctx.fillStyle = '#181218';
                ctx.beginPath();
                ctx.roundRect(winX, 18, 95, 48, 3);
                ctx.fill();

                // Sky through window — warm dusk
                const skyGrad = ctx.createLinearGradient(winX, 20, winX, 64);
                skyGrad.addColorStop(0, '#506888');
                skyGrad.addColorStop(1, '#786850');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(winX + 3, 21, 89, 42);

                // Building silhouette across the street
                ctx.fillStyle = '#2a2028';
                ctx.fillRect(winX + 10, 35, 35, 28);
                ctx.fillRect(winX + 50, 30, 30, 33);
                // Tiny warm windows in the building
                ctx.fillStyle = '#c0904060';
                ctx.fillRect(winX + 18, 40, 6, 8);
                ctx.fillRect(winX + 30, 42, 6, 8);
                ctx.fillStyle = '#b0805060';
                ctx.fillRect(winX + 56, 38, 6, 8);

                // Window bars
                ctx.fillStyle = '#141018';
                ctx.fillRect(winX + 33, 18, 3, 48);
                ctx.fillRect(winX + 63, 18, 3, 48);

                // ---- LIGHT BEAM ---- the warm cone of light
                const lightFlicker = 0.08 + Math.sin(time * 2.5 + wi) * 0.015;
                const beamGrad = ctx.createLinearGradient(winX + 45, 20, winX + 45, wallBottom);
                beamGrad.addColorStop(0, `rgba(255,210,150,${lightFlicker * 1.5})`);
                beamGrad.addColorStop(0.4, `rgba(255,200,140,${lightFlicker})`);
                beamGrad.addColorStop(1, `rgba(255,190,130,0)`);
                ctx.fillStyle = beamGrad;
                // Trapezoid light cone
                ctx.beginPath();
                ctx.moveTo(winX + 5, 66);
                ctx.lineTo(winX + 90, 66);
                ctx.lineTo(winX + 140, wallBottom + 10);
                ctx.lineTo(winX - 50, wallBottom + 10);
                ctx.fill();

                // Light dust motes in the beam — the most Ghibli touch
                for (let d = 0; d < 8; d++) {
                    const mx = winX + 20 + Math.sin(time * 0.3 + d * 1.7) * 40 + d * 6;
                    const my = 80 + d * 18 + Math.cos(time * 0.5 + d * 2.1) * 8;
                    const mAlpha = 0.15 + Math.sin(time * 1.5 + d * 3) * 0.1;
                    const mSize = 1 + Math.sin(d * 1.3) * 0.8;
                    ctx.fillStyle = `rgba(255,220,170,${mAlpha})`;
                    ctx.beginPath();
                    ctx.arc(mx, my, mSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ---- BACKGROUND WASHING MACHINES ----
        for (let i = 0; i < 3; i++) {
            const wx = ((i * 850 + 500) - parallax * 0.35) % (canvas.width + 850) - 425;
            if (wx > -100 && wx < canvas.width + 100) {
                const wy = wallBottom - 75;
                // Machine body — soft silhouette
                ctx.fillStyle = 'rgba(35,28,40,0.6)';
                ctx.beginPath();
                ctx.roundRect(wx, wy, 70, 72, 5);
                ctx.fill();
                // Door circle
                ctx.fillStyle = 'rgba(25,20,30,0.5)';
                ctx.beginPath();
                ctx.arc(wx + 35, wy + 40, 24, 0, Math.PI * 2);
                ctx.fill();
                // Glass — subtle blue
                ctx.fillStyle = 'rgba(60,80,100,0.2)';
                ctx.beginPath();
                ctx.arc(wx + 35, wy + 40, 19, 0, Math.PI * 2);
                ctx.fill();
                // Tiny LED
                ctx.fillStyle = `rgba(100,200,130,${0.3 + Math.sin(time + i) * 0.15})`;
                ctx.beginPath();
                ctx.arc(wx + 52, wy + 10, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---- BACKGROUND DUST MOTES ----
        drawDustMotes(time, 0.5); // far layer
    }

    function drawHouseBG(time) {
        const parallax = cameraX * 0.15;

        const upstairsColor = '#282040';
        const downstairsColor = '#352818';

        // Depth gradient
        const grad = ctx.createLinearGradient(0, cameraY - 100, 0, cameraY + canvas.height + 100);
        grad.addColorStop(0, upstairsColor);
        grad.addColorStop(0.55, upstairsColor);
        grad.addColorStop(0.62, '#302430');
        grad.addColorStop(1, downstairsColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        // ---- UPSTAIRS — Row house windows ----
        if (cameraY < 400) {
            for (let i = 0; i < 3; i++) {
                const wx = ((i * 620 + 80) - parallax * 0.45) % (canvas.width + 620) - 310;
                if (wx > -160 && wx < canvas.width + 160) {
                    const wy = 45;
                    // Night sky through window
                    ctx.fillStyle = '#141020';
                    ctx.beginPath();
                    ctx.roundRect(wx, wy, 115, 170, 3);
                    ctx.fill();

                    // Building across the street
                    ctx.fillStyle = '#281818';
                    ctx.fillRect(wx + 8, wy + 20, 100, 150);

                    // Warm windows in building — cozy neighborhood
                    const windowPairs = [
                        [20, 40], [65, 40], [20, 90], [65, 100]
                    ];
                    for (const [ox, oy] of windowPairs) {
                        const warmth = 0.3 + Math.sin(time * 0.3 + i + ox * 0.1) * 0.15;
                        ctx.fillStyle = `rgba(200,160,80,${warmth})`;
                        ctx.fillRect(wx + ox, wy + oy, 18, 25);
                    }

                    // Window frame (interior) — warm wood
                    ctx.fillStyle = '#4a3828';
                    ctx.fillRect(wx - 8, wy - 8, 131, 8);   // top
                    ctx.fillRect(wx - 8, wy + 170, 131, 10); // sill
                    ctx.fillRect(wx - 8, wy - 8, 8, 186);    // left
                    ctx.fillRect(wx + 115, wy - 8, 8, 186);  // right
                    // Sash
                    ctx.fillStyle = '#3a2820';
                    ctx.fillRect(wx, wy + 80, 115, 8);

                    // Curtain hints
                    ctx.fillStyle = 'rgba(80,50,40,0.3)';
                    ctx.fillRect(wx, wy, 18, 170);
                    ctx.fillRect(wx + 97, wy, 18, 170);

                    // Light beam from window
                    const beamAlpha = 0.03 + Math.sin(time * 1.5 + i * 2) * 0.01;
                    ctx.fillStyle = `rgba(200,170,120,${beamAlpha})`;
                    ctx.beginPath();
                    ctx.moveTo(wx + 10, wy + 170);
                    ctx.lineTo(wx + 105, wy + 170);
                    ctx.lineTo(wx + 130, wy + 280);
                    ctx.lineTo(wx - 20, wy + 280);
                    ctx.fill();
                }
            }

            // Wallpaper pattern hint
            ctx.fillStyle = 'rgba(50,35,55,0.15)';
            for (let y = 10; y < 300; y += 60) {
                for (let x = -parallax * 0.1 % 80 - 80; x < canvas.width + 80; x += 80) {
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ---- DOWNSTAIRS — Kitchen/living ----
        if (cameraY > 150) {
            // Kitchen cabinets in background
            for (let i = 0; i < 5; i++) {
                const cx = ((i * 480 + 60) - parallax * 0.5) % (canvas.width + 500) - 250;
                if (cx > -120 && cx < canvas.width + 120) {
                    const cy = 540;
                    // Cabinet
                    ctx.fillStyle = '#3a3028';
                    ctx.beginPath();
                    ctx.roundRect(cx, cy, 110, 55, 3);
                    ctx.fill();
                    // Doors
                    ctx.fillStyle = '#2e241c';
                    ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, 48, 47, 2); ctx.fill();
                    ctx.beginPath(); ctx.roundRect(cx + 58, cy + 4, 48, 47, 2); ctx.fill();
                    // Knobs — warm brass
                    ctx.fillStyle = '#b89858';
                    ctx.beginPath(); ctx.arc(cx + 44, cy + 38, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(cx + 66, cy + 38, 3, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Warm ambient glow downstairs
            ctx.fillStyle = 'rgba(200,160,100,0.02)';
            ctx.fillRect(0, 480, canvas.width, 200);
        }

        // Dust motes
        drawDustMotes(time, 0.5);
    }

    // ---- DUST MOTES — the soul of the Ghibli look ----
    function drawDustMotes(time, maxLayer) {
        for (const mote of dustMotes) {
            if (mote.layer > maxLayer) continue;
            mote.phase += 0.008;

            const parallaxFactor = 0.1 + mote.layer * 0.2;
            const sx = ((mote.x - cameraX * parallaxFactor) % (canvas.width + 100) + canvas.width + 100) % (canvas.width + 100) - 50;
            const sy = mote.y + Math.sin(mote.phase + time * mote.drift) * 12;

            // Only draw if on screen
            if (sy > cameraY - 20 && sy < cameraY + canvas.height + 20) {
                const alpha = mote.brightness * (0.7 + Math.sin(time * 0.8 + mote.phase) * 0.3);
                ctx.fillStyle = `rgba(255,225,175,${alpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, mote.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Foreground dust (drawn after all game objects for depth)
    function drawForegroundDust() {
        const time = performance.now() / 1000;
        for (const mote of dustMotes) {
            if (mote.layer <= 0.5) continue; // Only near-layer motes

            const parallaxFactor = 0.3 + mote.layer * 0.15;
            const sx = ((mote.x - cameraX * parallaxFactor) % (canvas.width + 200) + canvas.width + 200) % (canvas.width + 200) - 100;
            const sy = mote.y + Math.sin(mote.phase + time * mote.drift * 1.5) * 15 + cameraY;

            if (sy > cameraY - 20 && sy < cameraY + canvas.height + 20) {
                const alpha = mote.brightness * 0.5 * (0.6 + Math.sin(time * 1.2 + mote.phase * 2) * 0.4);
                ctx.fillStyle = `rgba(255,230,190,${alpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, mote.size * 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ---- AMBIENT LIGHTS — soft, warm, reactive to beat ----
    function drawAmbientLights(time) {
        const beatIntensity = beatPulse > 0 ? beatPulse : 0;
        const baseAlpha = 0.03 + beatIntensity * 0.08;

        // Warm amber light
        ctx.globalAlpha = baseAlpha * 1.2;
        ctx.fillStyle = '#e8a050';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.2 + Math.sin(time * 0.4) * 80,
            canvas.height * 0.3 + Math.cos(time * 0.6) * 40,
            110 + beatIntensity * 60 + Math.sin(time * 1.5) * 15,
            0, Math.PI * 2
        );
        ctx.fill();

        // Cool blue-green (subtle)
        ctx.globalAlpha = baseAlpha * 0.7;
        ctx.fillStyle = '#6098a0';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.75 + Math.cos(time * 0.35) * 70,
            canvas.height * 0.55 + Math.sin(time * 0.5) * 50,
            90 + beatIntensity * 40 + Math.cos(time * 1.2) * 12,
            0, Math.PI * 2
        );
        ctx.fill();

        // Warm rose
        ctx.globalAlpha = baseAlpha * 0.6;
        ctx.fillStyle = '#c87080';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.5 + Math.sin(time * 0.25) * 100,
            canvas.height * 0.2 + Math.cos(time * 0.4) * 35,
            70 + beatIntensity * 35 + Math.sin(time * 1.6) * 10,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    function drawCatchCounter() {
        const maxC = level.maxCatches || 3;
        const remaining = maxC - catchCount;
        const barX = canvas.width / 2 - 60;
        const barY = 60;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(barX - 8, barY - 4, 136, 24, 6);
        ctx.fill();

        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('CATCHES: ', barX, barY + 12);

        for (let i = 0; i < maxC; i++) {
            ctx.fillStyle = i < remaining ? '#ef4444' : '#333';
            ctx.fillText('●', barX + 75 + i * 14, barY + 12);
        }
    }

    function addParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x + Math.random() * 20,
                y: y + Math.random() * 20,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                size: Math.random() * 4 + 2,
                color,
                life: 500 + Math.random() * 500,
                maxLife: 1000
            });
        }
    }

    function updateHUD() {
        document.getElementById('hud-score').textContent = score;
        const livesEl = document.getElementById('hud-lives-label');
        livesEl.textContent = '❤️'.repeat(Math.max(0, player.lives));
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById('hud-timer');
        timerEl.textContent = Math.ceil(timer);

        timerEl.classList.remove('warning', 'danger');
        if (timer <= 10) {
            timerEl.classList.add('danger');
            if (Math.ceil(timer) !== Math.ceil(timer + 0.1)) {
                AudioSystem.playSFX('timer_warning');
            }
        } else if (timer <= 20) {
            timerEl.classList.add('warning');
        }

        const container = document.getElementById('hud-timer-container');
        container.style.display = timerActive ? 'flex' : 'none';
    }

    function pauseGame() {
        gameState = 'paused';
        document.getElementById('pause-overlay').classList.remove('hidden');
        AudioSystem.playSFX('button');
    }

    function resumeGame() {
        gameState = 'playing';
        document.getElementById('pause-overlay').classList.add('hidden');
        lastTime = performance.now();
        AudioSystem.playSFX('button');
    }

    function winGame() {
        gameState = 'win';
        score += Math.floor(timer * 10);
        AudioSystem.playSFX('win');

        document.getElementById('win-score').textContent = score;
        document.getElementById('win-time').textContent = level.timer
            ? `${Math.floor(level.timer - timer)}s` : 'N/A';
        document.getElementById('win-message').textContent = level.winMessage;
        document.getElementById('win-overlay').classList.remove('hidden');

        const nextBtn = document.getElementById('btn-win-next');
        nextBtn.style.display = currentChallenge < 2 ? 'inline-block' : 'none';
    }

    function loseGame() {
        gameState = 'lose';
        AudioSystem.playSFX('lose');

        document.getElementById('lose-message').textContent = level.loseMessage;
        document.getElementById('lose-overlay').classList.remove('hidden');

        drawLoseAnimation();
    }

    function drawLoseAnimation() {
        const loseCanvas = document.getElementById('lose-animation');
        const loseCtx = loseCanvas.getContext('2d');
        loseCtx.clearRect(0, 0, 200, 150);

        loseCtx.fillStyle = '#1a1520';
        loseCtx.fillRect(0, 0, 200, 150);

        loseCtx.save();
        loseCtx.translate(70, 50);
        loseCtx.scale(4, 4);
        Sprites.drawWhit(loseCtx, 0, 0, 'cry');
        loseCtx.restore();

        loseCtx.fillStyle = '#80b8e8';
        loseCtx.fillRect(78, 85, 3, 8);
        loseCtx.fillRect(102, 85, 3, 8);

        loseCtx.fillStyle = '#ef4444';
        loseCtx.font = '8px "Press Start 2P"';
        loseCtx.textAlign = 'center';
        loseCtx.fillText('Waaah!', 100, 140);
        loseCtx.textAlign = 'left';
    }

    function endLevel() {
        gameState = 'title';
        canvas.classList.remove('active');
        document.getElementById('game-hud').classList.add('hidden');
        InputSystem.hideTouchControls();

        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('win-overlay').classList.add('hidden');
        document.getElementById('lose-overlay').classList.add('hidden');

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function showToast(message) {
        document.querySelectorAll('.toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    return {
        init,
        startLevel,
        resumeGame,
        pauseGame,
        endLevel,
        showToast,
        onBeat() { beatPulse = 1; },
        get gameState() { return gameState; },
        set difficulty(d) { difficulty = d; },
        get difficulty() { return difficulty; },
        get currentChallenge() { return currentChallenge; },
        get score() { return score; }
    };
})();
