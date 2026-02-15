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

        // Concrete wall texture
        ctx.fillStyle = '#1e1a28';
        ctx.fillRect(0, 0, canvas.width, wallBottom);

        // Wall cracks (parallax)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const cx = ((i * 400 + 100) - parallax) % (canvas.width + 200) - 100;
            const cy = 50 + (i * 73) % (wallBottom - 100);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + 20 + (i % 3) * 10, cy + 15);
            ctx.lineTo(cx + 35 + (i % 2) * 20, cy + 10);
            ctx.stroke();
        }

        // Exposed pipes along ceiling
        ctx.strokeStyle = '#3a3248';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 35);
        ctx.lineTo(canvas.width, 35);
        ctx.stroke();
        ctx.strokeStyle = '#453c55';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 36);
        ctx.lineTo(canvas.width, 36);
        ctx.stroke();

        // Pipe joints
        for (let x = 120 - (parallax * 0.5) % 300; x < canvas.width; x += 300) {
            ctx.fillStyle = '#4a4260';
            ctx.fillRect(x, 28, 18, 16);
        }

        // Vertical pipe dropping down
        const vpx = ((600 - parallax) % canvas.width + canvas.width) % canvas.width;
        ctx.strokeStyle = '#3a3248';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(vpx, 35);
        ctx.lineTo(vpx, wallBottom * 0.6);
        ctx.stroke();

        // Tiny basement window (high on wall)
        const winX = ((250 - parallax) % (canvas.width + 200) + canvas.width + 200) % (canvas.width + 200) - 100;
        ctx.fillStyle = '#203050';
        ctx.fillRect(winX, 55, 70, 45);
        // Window glass with faint moonlight
        ctx.fillStyle = '#2a4070';
        ctx.fillRect(winX + 4, 59, 28, 37);
        ctx.fillRect(winX + 36, 59, 28, 37);
        // Window frame
        ctx.fillStyle = '#5a4838';
        ctx.fillRect(winX, 55, 70, 4);
        ctx.fillRect(winX, 96, 70, 4);
        ctx.fillRect(winX + 32, 55, 4, 45);

        // Water heater in far background
        const whx = ((1200 - parallax) % (canvas.width + 400) + canvas.width + 400) % (canvas.width + 400) - 200;
        ctx.fillStyle = '#2a2538';
        ctx.fillRect(whx, wallBottom - 140, 50, 140);
        ctx.fillStyle = '#333045';
        ctx.fillRect(whx + 5, wallBottom - 135, 40, 130);
        // Heater dial
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(whx + 25, wallBottom - 70, 4, 0, Math.PI * 2);
        ctx.fill();

        // Dust particles floating
        for (const star of bgStars) {
            star.twinkle += 1;
            const alpha = 0.15 + Math.sin(star.twinkle / 80) * 0.15;
            ctx.fillStyle = `rgba(200, 190, 180, ${alpha})`;
            const sx = ((star.x - cameraX * 0.2) % canvas.width + canvas.width) % canvas.width;
            ctx.fillRect(sx, star.y, star.size, star.size);
        }

        // Brick pattern near floor
        ctx.fillStyle = 'rgba(80, 60, 50, 0.15)';
        for (let row = 0; row < 3; row++) {
            const by = wallBottom - 20 - row * 16;
            const offset = row % 2 === 0 ? 0 : 25;
            for (let bx = -parallax * 0.3 % 50 + offset - 50; bx < canvas.width + 50; bx += 50) {
                ctx.fillRect(bx, by, 48, 14);
                ctx.strokeStyle = 'rgba(30, 20, 15, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, by, 48, 14);
            }
        }
    }

    function drawHouseBG(time) {
        const parallax = cameraX * 0.15;
        const wallBottom = canvas.height - 60;

        // Wallpaper base
        ctx.fillStyle = '#1c2035';
        ctx.fillRect(0, 0, canvas.width, wallBottom);

        // Wallpaper subtle stripe pattern
        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        for (let x = -parallax * 0.2 % 30; x < canvas.width; x += 30) {
            ctx.fillRect(x, 0, 12, wallBottom);
        }

        // Baseboards along bottom of wall
        ctx.fillStyle = '#2a2540';
        ctx.fillRect(0, wallBottom - 15, canvas.width, 15);
        ctx.fillStyle = '#352f48';
        ctx.fillRect(0, wallBottom - 15, canvas.width, 3);

        // Crown molding at top
        ctx.fillStyle = '#2a2540';
        ctx.fillRect(0, 0, canvas.width, 8);
        ctx.fillStyle = '#352f48';
        ctx.fillRect(0, 6, canvas.width, 2);

        // Windows with curtains
        for (let i = 0; i < 2; i++) {
            const wx = ((350 + i * 800 - parallax) % (canvas.width + 600) + canvas.width + 600) % (canvas.width + 600) - 300;
            if (wx > -120 && wx < canvas.width + 120) {
                // Window frame
                ctx.fillStyle = '#3a3555';
                ctx.fillRect(wx, 40, 100, 80);
                // Glass (slightly lit)
                ctx.fillStyle = '#1e3050';
                ctx.fillRect(wx + 6, 46, 40, 68);
                ctx.fillRect(wx + 52, 46, 40, 68);
                // Curtains
                ctx.fillStyle = '#4a2040';
                ctx.fillRect(wx - 8, 38, 20, 85);
                ctx.fillRect(wx + 88, 38, 20, 85);
                // Curtain drape lines
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(wx + 2, 40);
                ctx.quadraticCurveTo(wx - 5, 80, wx + 2, 120);
                ctx.stroke();
                // Window sill
                ctx.fillStyle = '#4a4260';
                ctx.fillRect(wx - 5, 118, 112, 6);
            }
        }

        // Family photos on wall (parallax)
        for (let i = 0; i < 3; i++) {
            const fx = ((150 + i * 550 - parallax * 0.8) % (canvas.width + 400) + canvas.width + 400) % (canvas.width + 400) - 200;
            if (fx > -50 && fx < canvas.width + 50) {
                // Frame
                ctx.fillStyle = '#5a4838';
                ctx.fillRect(fx, 60 + (i % 2) * 20, 36, 30);
                // Photo inside
                const colors = ['#3a5070', '#504060', '#405048'];
                ctx.fillStyle = colors[i];
                ctx.fillRect(fx + 3, 63 + (i % 2) * 20, 30, 24);
                // Stick figures in photos
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(fx + 12, 68 + (i % 2) * 20, 4, 8);
                ctx.fillRect(fx + 20, 70 + (i % 2) * 20, 3, 6);
            }
        }

        // Light fixture
        const lx = ((500 - parallax * 0.5) % (canvas.width + 200) + canvas.width + 200) % (canvas.width + 200) - 100;
        ctx.strokeStyle = '#3a3248';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, 25);
        ctx.stroke();
        ctx.fillStyle = '#ffe66d';
        ctx.globalAlpha = 0.06 + Math.sin(time * 3) * 0.02;
        ctx.beginPath();
        ctx.arc(lx, 30, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Floating dust (background particles)
        for (const star of bgStars) {
            star.twinkle += 1;
            const alpha = 0.12 + Math.sin(star.twinkle / 60) * 0.1;
            ctx.fillStyle = `rgba(220, 210, 200, ${alpha})`;
            const sx = ((star.x - cameraX * 0.2) % canvas.width + canvas.width) % canvas.width;
            ctx.fillRect(sx, star.y, star.size, star.size);
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
