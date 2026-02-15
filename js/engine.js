/* ============================================
   WhitWorld — Game Engine
   Main game loop, rendering, state management
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
    let beatPulse = 0; // 0-1, driven by music beat callback

    // Background decoration
    let bgStars = [];

    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Generate background stars
        for (let i = 0; i < 50; i++) {
            bgStars.push({
                x: Math.random() * 2000,
                y: Math.random() * canvas.height * 0.6,
                size: Math.random() * 2 + 1,
                twinkle: Math.random() * 1000,
                speed: Math.random() * 0.3 + 0.1
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
        // Give brief spawn invincibility
        player.invincible = true;
        player.invincibleTimer = 2000;

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

        // Show HUD
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('hud-challenge-name').textContent = level.name;
        updateHUD();

        // Show touch controls on mobile
        if (InputSystem.getIsMobile()) {
            InputSystem.showTouchControls();
        }

        // Start music if not playing
        if (!AudioSystem.isPlaying) {
            AudioSystem.startMusic();
        }

        // Intro dialog
        setTimeout(() => {
            if (challengeNum === 1) {
                showToast("Navigate the basement! Get to Whit! ➡️");
            } else {
                showToast("Get to the kitchen for batteries! 🔋");
            }
            introPlayed = true;
        }, 500);

        // Start game loop
        lastTime = performance.now();
        if (animFrameId) cancelAnimationFrame(animFrameId);
        gameLoop(lastTime);
    }

    function gameLoop(timestamp) {
        const dt = Math.min(timestamp - lastTime, 33); // Cap at ~30fps min
        lastTime = timestamp;

        if (gameState === 'playing') {
            update(dt);
            render();
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        // Pause check
        if (InputSystem.wasJustPressed('pause')) {
            pauseGame();
            return;
        }

        // Update player
        player.update(dt, level.platforms, difficulty);
        player.canInteract = false;
        player.interactTarget = null;

        // Camera follow (horizontal)
        const targetCamX = player.x - canvas.width * 0.35;
        cameraX += (targetCamX - cameraX) * 0.08;
        cameraX = Math.max(0, Math.min(cameraX, level.width - canvas.width));

        // Camera follow (vertical) — smooth follow when player goes below mid-screen
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
            // Fell off
            const died = player.takeDamage();
            if (died) {
                loseGame();
                return;
            }
            // Reset position
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
            // Check collision with player
            if (obs.harmful && obs.active && player.collidesWith(obs)) {
                const died = player.takeDamage();
                if (died) {
                    loseGame();
                    return;
                }
                // Push player back
                player.vx = -player.facing * 5;
                player.vy = -3;
                shakeAmount = 5;
                addParticles(player.x, player.y, '#ff6b9d', 8);
            }
        }

        // Rolling obstacles (challenge 1)
        if (level.rollingInterval) {
            rollingTimer += dt;
            if (rollingTimer >= level.rollingInterval) {
                rollingTimer = 0;
                // Spawn a rolling ball from the right side of view
                const spawnX = cameraX + canvas.width + 50;
                if (spawnX < level.width - 300) {
                    const groundY = canvas.height - 60;
                    rollingObstacles.push(
                        new RollingObstacle(spawnX, groundY - 30, 30, level.rollingSpeed, 'soccer')
                    );
                }
            }
        }

        // Update rolling obstacles
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
            // Remove if off screen left
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
                    // For battery drawer, check if carrying battery
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
                // Push player away
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

        // Screen shake decay
        if (shakeAmount > 0) {
            shakeAmount *= 0.9;
            if (shakeAmount < 0.5) shakeAmount = 0;
        }

        // Beat pulse decay
        if (beatPulse > 0) {
            beatPulse *= 0.92;
            if (beatPulse < 0.01) beatPulse = 0;
        }

        // Update score display
        updateHUD();
        InputSystem.clearJustPressed();
    }

    function render() {
        ctx.save();

        // Screen shake
        if (shakeAmount > 0) {
            ctx.translate(
                (Math.random() - 0.5) * shakeAmount * 2,
                (Math.random() - 0.5) * shakeAmount * 2
            );
        }

        // Vertical camera offset
        ctx.translate(0, -cameraY);

        // Background
        drawBackground();

        // Platforms
        for (const plat of level.platforms) {
            plat.draw(ctx, cameraX);
        }

        // Obstacles
        for (const obs of level.obstacles) {
            if (obs.active) obs.draw(ctx, cameraX);
        }

        // Rolling obstacles
        for (const roll of rollingObstacles) {
            roll.draw(ctx, cameraX);
        }

        // Collectibles
        for (const item of level.collectibles) {
            item.draw(ctx, cameraX);
        }

        // Interaction zones
        for (const zone of level.interactionZones) {
            zone.draw(ctx, cameraX);
        }

        // NPCs
        for (const npc of level.npcs) {
            npc.draw(ctx, cameraX);
        }

        // Player
        player.draw(ctx, cameraX);

        // Particles
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // Catch counter for challenge 2 (draw at fixed screen position)
        if (level.maxCatches) {
            ctx.save();
            ctx.translate(0, cameraY); // undo vertical camera for HUD
            drawCatchCounter();
            ctx.restore();
        }

        ctx.restore();
    }

    function drawBackground() {
        // Gradient background
        // Adjusted to follow camera Y (vertical scrolling) to prevent smearing
        const grad = ctx.createLinearGradient(0, cameraY, 0, cameraY + canvas.height);
        grad.addColorStop(0, level.bgColor);
        grad.addColorStop(1, level.bgAccent);
        ctx.fillStyle = grad;
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        const time = performance.now() / 1000;
        const theme = level.theme || 'basement';

        if (theme === 'basement') {
            drawBasementBG(time);
        } else if (theme === 'house') {
            drawHouseBG(time);
        }

        // Ambient colored lights that react to music beat
        const beatIntensity = beatPulse > 0 ? beatPulse : 0;
        const baseAlpha = 0.04 + beatIntensity * 0.12;
        ctx.globalAlpha = baseAlpha;

        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.2 + Math.sin(time * 0.5) * 100,
            canvas.height * 0.3 + Math.cos(time * 0.7) * 50,
            120 + beatIntensity * 80 + Math.sin(time * 2) * 20,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.7 + Math.cos(time * 0.4) * 80,
            canvas.height * 0.6 + Math.sin(time * 0.6) * 60,
            100 + beatIntensity * 60 + Math.cos(time * 1.5) * 15,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = '#ffe66d';
        ctx.beginPath();
        ctx.arc(
            canvas.width * 0.5 + Math.sin(time * 0.3) * 120,
            canvas.height * 0.2 + Math.cos(time * 0.5) * 40,
            80 + beatIntensity * 50 + Math.sin(time * 1.8) * 15,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    function drawBasementBG(time) {
        const parallax = cameraX * 0.15;
        const wallBottom = canvas.height - 60;

        // Dark underground concrete/brick wall
        const grad = ctx.createLinearGradient(0, 0, 0, wallBottom);
        grad.addColorStop(0, '#1a1015'); // Dark shadow top
        grad.addColorStop(1, '#2d2429'); // Brick color bottom
        ctx.fillStyle = grad;
        ctx.fillRect(0, cameraY, canvas.width, wallBottom + 500); // Cover deep

        // Brick pattern (scrolling)
        ctx.fillStyle = 'rgba(45, 30, 35, 0.5)';
        for (let y = -20; y < wallBottom + 200; y += 40) {
            const offset = (y / 40) % 2 === 0 ? 0 : 40;
            for (let x = -parallax * 0.2 % 80 + offset - 80; x < canvas.width + 80; x += 80) {
                if (cameraY + canvas.height > y && cameraY < y + 35) { // Cull offscreen
                    ctx.fillRect(x, y, 76, 35);
                }
            }
        }

        // Exposed pipes along ceiling (Foreground pop)
        ctx.strokeStyle = '#3a3248';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(canvas.width, 40);
        ctx.stroke();

        ctx.strokeStyle = '#4a4255'; // Highlight
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 36);
        ctx.lineTo(canvas.width, 36);
        ctx.stroke();

        // Vertical pipes
        for (let i = 0; i < 5; i++) {
            const px = ((i * 500 + 200) - parallax * 0.8) % (canvas.width + 500) - 250;
            if (px > -50 && px < canvas.width + 50) {
                ctx.strokeStyle = '#353040';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(px, 30);
                ctx.lineTo(px, wallBottom - 50);
                ctx.stroke();

                // Joint
                ctx.fillStyle = '#454050';
                ctx.fillRect(px - 6, 150, 12, 20);
            }
        }

        // Washing machines in background (Silhouettes)
        for (let i = 0; i < 3; i++) {
            const wx = ((i * 800 + 400) - parallax * 0.4) % (canvas.width + 800) - 400;
            if (wx > -100 && wx < canvas.width + 100) {
                const wy = wallBottom - 80;
                ctx.fillStyle = '#25202a';
                ctx.fillRect(wx, wy, 80, 80); // Machine body

                ctx.fillStyle = '#1a1520';
                ctx.beginPath();
                ctx.arc(wx + 40, wy + 40, 30, 0, Math.PI * 2); // Door
                ctx.fill();

                ctx.fillStyle = '#304050';
                ctx.beginPath();
                ctx.arc(wx + 40, wy + 40, 24, 0, Math.PI * 2); // Glass
                ctx.fill();
            }
        }

        // Small high windows showing "sidewalk level"
        const winX = ((300 - parallax * 0.1) % (canvas.width + 400) + canvas.width + 400) % (canvas.width + 400) - 200;
        if (winX > -100 && winX < canvas.width + 100) {
            ctx.fillStyle = '#101015'; // Frame
            ctx.fillRect(winX, 20, 100, 40);

            // Street light pouring in
            const gradient = ctx.createLinearGradient(winX, 20, winX, 80);
            gradient.addColorStop(0, '#506080'); // Blueish street light
            gradient.addColorStop(1, 'rgba(80, 96, 128, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(winX + 5, 25, 90, 80); // Light beam

            // Bars on window
            ctx.fillStyle = '#000';
            ctx.fillRect(winX + 30, 20, 4, 40);
            ctx.fillRect(winX + 66, 20, 4, 40);
        }

        // Floating dust
        for (const star of bgStars) {
            star.twinkle += 1;
            const alpha = 0.1 + Math.sin(star.twinkle / 80) * 0.1;
            ctx.fillStyle = `rgba(200, 200, 190, ${alpha})`;
            const sx = ((star.x - cameraX * 0.3) % canvas.width + canvas.width) % canvas.width;
            ctx.fillRect(sx, star.y, star.size, star.size);
        }
    }

    function drawHouseBG(time) {
        const parallax = cameraX * 0.15;
        // Use camera movement to determine "floors"
        // Upstairs is at y=0 (relative), Downstairs is at y=200+

        const upstairsColor = '#2d2640'; // Deep purple/blue row house interior
        const downstairsColor = '#3a3028'; // Warm brownish kitchen/basement mix

        // Background fil based on depth
        const grad = ctx.createLinearGradient(0, cameraY - 100, 0, cameraY + canvas.height + 100);
        grad.addColorStop(0, upstairsColor);
        grad.addColorStop(0.6, upstairsColor);
        grad.addColorStop(0.65, downstairsColor);
        grad.addColorStop(1, downstairsColor);

        ctx.fillStyle = grad;
        ctx.fillRect(0, cameraY, canvas.width, canvas.height); // Correct fill

        // UPSTAIRS DECOR (Row House Windows)
        if (cameraY < 400) {
            // Draw row house windows looking out to street
            for (let i = 0; i < 3; i++) {
                const wx = ((i * 600 + 100) - parallax * 0.5) % (canvas.width + 600) - 300;
                if (wx > -150 && wx < canvas.width + 150) {
                    const wy = 50;
                    // Outside view (Brick building across street)
                    ctx.fillStyle = '#1a1520'; // Night sky/street
                    ctx.fillRect(wx, wy, 120, 180);

                    // Building opposite
                    ctx.fillStyle = '#2a1a1a'; // Dark red brick
                    ctx.fillRect(wx + 10, wy + 20, 100, 160);
                    // Windows opposite
                    ctx.fillStyle = '#403010'; // Dim yellow light
                    ctx.fillRect(wx + 20, wy + 40, 20, 30);
                    ctx.fillRect(wx + 70, wy + 40, 20, 30);
                    ctx.fillRect(wx + 20, wy + 100, 20, 30);

                    // Window Frame (Interior)
                    ctx.fillStyle = '#4a3b30'; // Wood trim
                    ctx.fillRect(wx - 10, wy - 10, 140, 10); // Top
                    ctx.fillRect(wx - 10, wy + 180, 140, 10); // Sill
                    ctx.fillRect(wx - 10, wy - 10, 10, 200); // Left
                    ctx.fillRect(wx + 120, wy - 10, 10, 200); // Right

                    // Sash
                    ctx.fillStyle = '#3a2b20';
                    ctx.fillRect(wx, wy + 85, 120, 10);
                }
            }
        }

        // DOWNSTAIRS DECOR (Kitchen / Living)
        if (cameraY > 200) {
            // Checkered tile pattern hint or wainscoting
            const floorY = canvas.height + 300; // Deep down
            // Just draw some kitchen cabinets in background
            for (let i = 0; i < 4; i++) {
                const cx = ((i * 500 + 100) - parallax * 0.6) % (canvas.width + 600) - 300;
                // Cabinet
                const cy = 600; // Relative Y
                // Since this is background, we draw relative to camera or fixed?
                // Background should scroll with camera Y but slower? 
                // Currently context is translated by -cameraY.
                // So drawing at fixed Y draws at world Y.
                // Downstairs is at Y ~ 400+.

                if (cx > -100 && cx < canvas.width + 100) {
                    ctx.fillStyle = '#3e3430';
                    ctx.fillRect(cx, 550, 120, 60); // Upper cabinet
                    ctx.fillStyle = '#302824';
                    ctx.fillRect(cx + 5, 555, 50, 50); // Door L
                    ctx.fillRect(cx + 65, 555, 50, 50); // Door R
                    // Knobs
                    ctx.fillStyle = '#a0855c';
                    ctx.beginPath(); ctx.arc(cx + 45, 595, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(cx + 75, 595, 3, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
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
        // Lives as hearts
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

        // Show/hide timer container
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
        score += Math.floor(timer * 10); // Bonus for remaining time
        AudioSystem.playSFX('win');

        document.getElementById('win-score').textContent = score;
        document.getElementById('win-time').textContent = level.timer
            ? `${Math.floor(level.timer - timer)}s` : 'N/A';
        document.getElementById('win-message').textContent = level.winMessage;
        document.getElementById('win-overlay').classList.remove('hidden');

        // Hide next button if last challenge
        const nextBtn = document.getElementById('btn-win-next');
        nextBtn.style.display = currentChallenge < 2 ? 'inline-block' : 'none';
    }

    function loseGame() {
        gameState = 'lose';
        AudioSystem.playSFX('lose');

        document.getElementById('lose-message').textContent = level.loseMessage;
        document.getElementById('lose-overlay').classList.remove('hidden');

        // Draw lose animation (Whit bumping knee or crying)
        drawLoseAnimation();
    }

    function drawLoseAnimation() {
        const loseCanvas = document.getElementById('lose-animation');
        const loseCtx = loseCanvas.getContext('2d');
        loseCtx.clearRect(0, 0, 200, 150);

        // Background
        loseCtx.fillStyle = '#1a1520';
        loseCtx.fillRect(0, 0, 200, 150);

        // Draw Whit crying
        const whitSprite = Sprites.getWhit('cry', 4);
        loseCtx.drawImage(whitSprite, 70, 50);

        // Tears
        loseCtx.fillStyle = '#60a5fa';
        loseCtx.fillRect(78, 85, 3, 8);
        loseCtx.fillRect(102, 85, 3, 8);

        // Text
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

        // Hide overlays
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('win-overlay').classList.add('hidden');
        document.getElementById('lose-overlay').classList.add('hidden');

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function showToast(message) {
        // Remove existing toasts
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
