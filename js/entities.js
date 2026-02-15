/* ============================================
   WhitWorld — Entity System
   Player, NPCs, Obstacles, Items
   ============================================ */

// Base entity class
class Entity {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.active = true;
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    }

    distanceTo(other) {
        const dx = (this.x + this.w / 2) - (other.x + other.w / 2);
        const dy = (this.y + this.h / 2) - (other.y + other.h / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Player (Ingrid)
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 36, 60);
        this.speed = 4.2;
        this.jumpForce = -14;
        this.gravity = 0.55;
        this.maxFallSpeed = 12;
        this.grounded = false;
        this.facing = 1; // 1 = right, -1 = left
        this.state = 'stand'; // stand, run1, run2, jump
        this.animTimer = 0;
        this.animFrame = 0;
        this.lives = 3;
        this.score = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.canInteract = false;
        this.interactTarget = null;
        this.carrying = null; // for battery challenge
        this.flashTimer = 0;
    }

    update(dt, platforms, difficulty) {
        const speedMult = difficulty === 'easy' ? 1.0 : difficulty === 'hard' ? 1.2 : 1.1;

        // Horizontal movement
        if (InputSystem.isDown('left')) {
            this.vx = -this.speed * speedMult;
            this.facing = -1;
        } else if (InputSystem.isDown('right')) {
            this.vx = this.speed * speedMult;
            this.facing = 1;
        } else {
            this.vx *= 0.7; // friction
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Jump
        if (InputSystem.wasJustPressed('jump') && this.grounded) {
            this.vy = this.jumpForce;
            this.grounded = false;
            AudioSystem.playSFX('jump');
        }

        // Gravity
        this.vy += this.gravity;
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

        // Move X
        this.x += this.vx;

        // Collide with platforms (X)
        for (const plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vx > 0) {
                    this.x = plat.x - this.w;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.w;
                }
                this.vx = 0;
            }
        }

        // Move Y
        this.y += this.vy;
        this.grounded = false;

        // Collide with platforms (Y)
        for (const plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0) {
                    this.y = plat.y - this.h;
                    this.grounded = true;
                    if (this.vy > 4) AudioSystem.playSFX('land');
                } else if (this.vy < 0) {
                    this.y = plat.y + plat.h;
                }
                this.vy = 0;
            }
        }

        // Animation
        this.animTimer += dt;
        if (!this.grounded) {
            this.state = 'jump';
        } else if (Math.abs(this.vx) > 0.5) {
            if (this.animTimer > 150) {
                this.animFrame = (this.animFrame + 1) % 2;
                this.animTimer = 0;
            }
            this.state = this.animFrame === 0 ? 'run1' : 'run2';
        } else {
            this.state = 'stand';
            this.animFrame = 0;
        }

        // Invincibility
        if (this.invincible) {
            this.invincibleTimer -= dt;
            this.flashTimer += dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.flashTimer = 0;
            }
        }
    }

    takeDamage() {
        if (this.invincible) return false;
        this.lives--;
        this.invincible = true;
        this.invincibleTimer = 1500;
        AudioSystem.playSFX('hit');
        return this.lives <= 0;
    }

    draw(ctx, cameraX) {
        if (this.invincible && Math.floor(this.flashTimer / 100) % 2 === 0) {
            return; // Flash effect
        }

        // Center sprite horizontally on hitbox, align bottom
        // Hitbox: 36x60, Sprite: 48x64
        const drawX = this.x - cameraX - 6;
        const drawY = this.y - 4;

        ctx.save();
        if (this.facing === -1) {
            // Flip around center of sprite
            ctx.translate(drawX + 48, 0); // 48 is sprite width
            ctx.scale(-1, 1);
            Sprites.drawIngrid(ctx, 0, drawY, this.state);
        } else {
            Sprites.drawIngrid(ctx, drawX, drawY, this.state);
        }
        ctx.restore();

        // Carrying indicator
        if (this.carrying) {
            ctx.fillStyle = '#22c55e';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('🔋', drawX + 8, this.y - 8);
        }
    }
}

// Whit NPC
class WhitNPC extends Entity {
    constructor(x, y, behavior) {
        super(x, y, 30, 48);
        this.behavior = behavior; // 'stuck', 'chasing', 'idle'
        this.state = 'stand'; // stand, cry, happy, chase
        this.animTimer = 0;
        this.chaseSpeed = 2;
        this.speechBubble = null;
        this.speechTimer = 0;
        this.bobTimer = 0;
        this.targetPlayer = null;
        this.catchCount = 0;
        this.maxCatches = 3;
        this.caughtCooldown = 0;
        // Chase AI improvements
        this.chaseDelay = 4000;      // ms before Whit starts chasing
        this.chaseWaiting = true;    // starts waiting
        this.pauseTimer = 0;         // periodic rest timer
        this.pauseDuration = 1500;   // how long he pauses
        this.chaseInterval = 4000;   // how long before next pause
        this.chaseElapsed = 0;       // time spent chasing since last pause
        this.isPaused = false;       // currently resting?
        this.grounded = false;
    }

    update(dt, player, platforms) {
        this.animTimer += dt;
        this.bobTimer += dt;

        if (this.speechTimer > 0) {
            this.speechTimer -= dt;
            if (this.speechTimer <= 0) {
                this.speechBubble = null;
            }
        }

        if (this.caughtCooldown > 0) {
            this.caughtCooldown -= dt;
        }

        if (this.behavior === 'stuck') {
            // Whit is stuck in washing machine - bob and cry
            this.state = 'cry';
            this.y += Math.sin(this.bobTimer / 300) * 0.3;
        } else if (this.behavior === 'chasing') {
            // Delay before chasing starts
            if (this.chaseWaiting) {
                this.chaseDelay -= dt;
                this.state = 'cry';
                // Bob in place while waiting
                this.y += Math.sin(this.bobTimer / 300) * 0.3;
                if (this.chaseDelay <= 0) {
                    this.chaseWaiting = false;
                    this.say("I'M COMING! 😡");
                }
                // Gravity while waiting
                this.vy += 0.55;
                if (this.vy > 10) this.vy = 10;
                this.y += this.vy;
                for (const plat of platforms) {
                    if (this.collidesWith(plat)) {
                        if (this.vy > 0) { this.y = plat.y - this.h; this.vy = 0; this.grounded = true; }
                    }
                }
                return null;
            }

            // Periodic pause (Whit gets tired)
            if (this.isPaused) {
                this.pauseTimer -= dt;
                this.state = 'stand';
                if (this.pauseTimer <= 0) {
                    this.isPaused = false;
                    this.chaseElapsed = 0;
                    const taunts = ["Wait up! 😤", "Come back! 😡", "I want it! 😭", "INGRIIIID! 😫"];
                    this.say(taunts[Math.floor(Math.random() * taunts.length)]);
                }
            } else {
                this.state = 'chase';
                this.chaseElapsed += dt;
                // After chasing for a while, take a break
                if (this.chaseElapsed >= this.chaseInterval) {
                    this.isPaused = true;
                    this.pauseTimer = this.pauseDuration;
                }
            }

            // Chase the player (only if not paused)
            if (player && !this.isPaused) {
                const dx = player.x - this.x;
                const dir = dx > 0 ? 1 : -1;

                // Rubber banding: Speed up when far away to catch up!
                const dist = Math.abs(dx);
                let speedMult = 1.0;

                if (dist > 800) {
                    speedMult = 2.5; // Very fast catchup
                } else if (dist > 400) {
                    speedMult = 1.8; // Fast catchup
                } else if (dist < 100) {
                    speedMult = 0.8; // Slow down slightly when very close (give player a chance)
                }

                this.vx = this.chaseSpeed * dir * speedMult;
                this.x += this.vx;

                // Debug log every 60 frames
                if (Math.floor(this.animTimer) % 60 === 0) {
                    console.log(`Whit Chasing: dist=${Math.floor(dist)}, speed=${this.vx.toFixed(1)}`);
                }
            } else {
                this.vx *= 0.8; // Friction when paused
            }

            // Gravity
            this.vy += 0.55;
            if (this.vy > 10) this.vy = 10;
            this.y += this.vy;

            // Platform collision
            this.grounded = false;
            for (const plat of platforms) {
                if (this.collidesWith(plat)) {
                    if (this.vy > 0) {
                        this.y = plat.y - this.h;
                        this.vy = 0;
                        this.grounded = true;
                    }
                }
            }

            // Catch player (only when actively chasing)
            if (player && !this.isPaused && this.collidesWith(player) && this.caughtCooldown <= 0) {
                this.catchCount++;
                this.caughtCooldown = 3000;
                this.say("GIVE IT BACK! 😡");
                AudioSystem.playSFX('whit_cry');
                // Pause briefly after catching
                this.isPaused = true;
                this.pauseTimer = 2000;
                return 'caught';
            }
        } else {
            this.state = 'stand';
        }

        return null;
    }

    say(text) {
        this.speechBubble = text;
        this.speechTimer = 2500;
    }

    draw(ctx, cameraX) {
        // Hitbox: 30x48, Sprite: 40x54
        // Offset X: -5, Offset Y: -6
        const drawX = this.x - cameraX - 5;
        const drawY = this.y - 6;

        // Draw Whit
        ctx.save();
        if (this.behavior === 'chasing' && this.vx < 0) {
            ctx.translate(drawX + 40, 0); // 40 is sprite width
            ctx.scale(-1, 1);
            Sprites.drawWhit(ctx, 0, drawY, this.state);
        } else {
            Sprites.drawWhit(ctx, drawX, drawY, this.state);
        }
        ctx.restore();

        // Speech bubble
        if (this.speechBubble) {
            ctx.fillStyle = 'white';
            const bubbleW = this.speechBubble.length * 6 + 16;
            const bubbleX = drawX - bubbleW / 2 + this.w / 2;
            const bubbleY = this.y - 30;

            // Bubble background
            ctx.beginPath();
            ctx.roundRect(bubbleX, bubbleY, bubbleW, 22, 6);
            ctx.fill();

            // Bubble pointer
            ctx.beginPath();
            ctx.moveTo(drawX + this.w / 2 - 5, bubbleY + 22);
            ctx.lineTo(drawX + this.w / 2, bubbleY + 28);
            ctx.lineTo(drawX + this.w / 2 + 5, bubbleY + 22);
            ctx.fill();

            // Text
            ctx.fillStyle = '#333';
            ctx.font = '7px "Press Start 2P"';
            ctx.fillText(this.speechBubble, bubbleX + 8, bubbleY + 15);
        }
    }
}

// Obstacle (static)
class Obstacle extends Entity {
    constructor(x, y, w, h, type) {
        super(x, y, w, h);
        this.type = type; // 'soccer', 'toy_red', 'toy_blue', 'couch', 'cooler', 'laundry'
        this.harmful = true;
        this.bobTimer = Math.random() * 1000;
    }

    update(dt) {
        this.bobTimer += dt;
    }

    draw(ctx, cameraX) {
        const dx = this.x - cameraX;
        switch (this.type) {
            case 'soccer':
                // Slight bounce animation
                const bounceY = Math.sin(this.bobTimer / 400) * 2;
                Sprites.drawSoccerBall(ctx, dx, this.y + bounceY, this.w);
                break;
            case 'toy_red':
                Sprites.drawToy(ctx, dx, this.y, this.w, this.h, '#ef4444');
                break;
            case 'toy_blue':
                Sprites.drawToy(ctx, dx, this.y, this.w, this.h, '#3b82f6');
                break;
            case 'toy_purple':
                Sprites.drawToy(ctx, dx, this.y, this.w, this.h, '#a855f7');
                break;
            case 'couch':
                this.harmful = false;
                Sprites.drawCouch(ctx, dx, this.y, this.w, this.h);
                break;
            case 'cooler':
                Sprites.drawCooler(ctx, dx, this.y, this.w, this.h);
                break;
            case 'laundry':
                Sprites.drawLaundryPile(ctx, dx, this.y, this.w, this.h);
                break;
            default:
                ctx.fillStyle = '#888';
                ctx.fillRect(dx, this.y, this.w, this.h);
        }
    }
}

// Rolling obstacle (moves)
class RollingObstacle extends Entity {
    constructor(x, y, size, speed, type) {
        super(x, y, size, size);
        this.type = type || 'soccer';
        this.speed = speed || 2;
        this.rotation = 0;
    }

    update(dt) {
        this.x -= this.speed;
        this.rotation += this.speed * 0.05;
    }

    draw(ctx, cameraX) {
        const dx = this.x - cameraX;
        ctx.save();
        ctx.translate(dx + this.w / 2, this.y + this.h / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-this.w / 2, -this.h / 2);
        Sprites.drawSoccerBall(ctx, 0, 0, this.w);
        ctx.restore();
    }
}

// Platform (solid ground)
class Platform extends Entity {
    constructor(x, y, w, h, type) {
        super(x, y, w, h);
        this.type = type || 'ground'; // 'ground', 'shelf', 'stairs', 'counter'
    }

    draw(ctx, cameraX) {
        const dx = this.x - cameraX;

        switch (this.type) {
            case 'ground':
                ctx.fillStyle = Sprites.PAL.floor;
                ctx.fillRect(dx, this.y, this.w, this.h);
                // Top edge details
                ctx.fillStyle = '#5a4838';
                ctx.fillRect(dx, this.y, this.w, 4);
                break;
            case 'shelf':
                // Wood texture
                ctx.fillStyle = '#8B7355';
                ctx.beginPath();
                ctx.roundRect(dx, this.y, this.w, this.h, 4);
                ctx.fill();
                // Top Shine
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(dx + 2, this.y, this.w - 4, 3);
                // Shadow underneath
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(dx + 4, this.y + this.h - 4, this.w - 8, 4);
                break;
            case 'stairs':
                ctx.fillStyle = '#7c6c5c';
                ctx.fillRect(dx, this.y, this.w, this.h);
                // Carpet runner?
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(dx + this.w * 0.1, this.y, this.w * 0.8, this.h);
                // Nosing
                ctx.fillStyle = '#5a4838';
                ctx.fillRect(dx, this.y, this.w, 4);
                break;
            case 'counter':
                ctx.fillStyle = '#f3f4f6'; // Marble top
                ctx.beginPath();
                ctx.roundRect(dx, this.y, this.w, this.h, 2);
                ctx.fill();
                // Edge
                ctx.fillStyle = '#d1d5db';
                ctx.fillRect(dx, this.y + 6, this.w, this.h - 6);
                // Cabinet below
                ctx.fillStyle = '#b45309';
                ctx.fillRect(dx + 2, this.y + 8, this.w - 4, this.h - 10);
                break;
            default:
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.roundRect(dx, this.y, this.w, this.h, 4);
                ctx.fill();
        }
    }
}

// Collectible item
class Collectible extends Entity {
    constructor(x, y, w, h, type) {
        super(x, y, w, h);
        this.type = type; // 'battery', 'star', 'heart'
        this.collected = false;
        this.bobTimer = Math.random() * 1000;
        this.sparkleTimer = 0;
    }

    update(dt) {
        this.bobTimer += dt;
        this.sparkleTimer += dt;
    }

    draw(ctx, cameraX) {
        if (this.collected) return;
        const dx = this.x - cameraX;
        const bobY = this.y + Math.sin(this.bobTimer / 300) * 3;

        // Sparkle effect
        if (Math.floor(this.sparkleTimer / 200) % 3 === 0) {
            ctx.fillStyle = 'rgba(255, 230, 109, 0.5)';
            ctx.beginPath();
            ctx.arc(dx + this.w / 2 + Math.sin(this.sparkleTimer / 100) * 8,
                bobY - 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        switch (this.type) {
            case 'battery':
                Sprites.drawBattery(ctx, dx, bobY, this.w, this.h);
                break;
            case 'star':
                // Vector Star
                ctx.fillStyle = '#ffe66d';
                ctx.translate(dx + this.w / 2, bobY + this.h / 2);
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.w / 2,
                        -Math.sin((18 + i * 72) * Math.PI / 180) * this.w / 2);
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * this.w / 4,
                        -Math.sin((54 + i * 72) * Math.PI / 180) * this.w / 4);
                }
                ctx.fill();
                ctx.translate(-(dx + this.w / 2), -(bobY + this.h / 2));
                break;
            case 'heart':
                // Vector Heart
                ctx.fillStyle = '#ef4444';
                const hx = dx + this.w / 2;
                const hy = bobY + this.h / 2;
                const s = this.w / 2;
                ctx.beginPath();
                ctx.moveTo(hx, hy + s * 0.7);
                ctx.bezierCurveTo(hx + s, hy + s * 0.3, hx + s, hy - s * 0.5, hx, hy - s * 0.2);
                ctx.bezierCurveTo(hx - s, hy - s * 0.5, hx - s, hy + s * 0.3, hx, hy + s * 0.7);
                ctx.fill();
                break;
        }
    }
}

// Interaction zone (washing machine, battery drawer, etc.)
class InteractionZone extends Entity {
    constructor(x, y, w, h, type, onInteract) {
        super(x, y, w, h);
        this.type = type; // 'washing_machine', 'battery_drawer'
        this.onInteract = onInteract;
        this.promptVisible = false;
        this.interacted = false;
        this.animTimer = 0;
    }

    update(dt, player) {
        this.animTimer += dt;
        if (player && this.collidesWith(player) && !this.interacted) {
            this.promptVisible = true;
            player.canInteract = true;
            player.interactTarget = this;
        } else {
            this.promptVisible = false;
        }
    }

    interact(player) {
        if (this.onInteract && !this.interacted) {
            this.interacted = true;
            return this.onInteract(player);
        }
        return null;
    }

    draw(ctx, cameraX) {
        const dx = this.x - cameraX;

        switch (this.type) {
            case 'washing_machine':
                Sprites.drawWashingMachine(ctx, dx, this.y, this.w, this.h);
                break;
            case 'battery_drawer':
                Sprites.drawBatteryDrawer(ctx, dx, this.y, this.w, this.h);
                break;
            case 'guitar':
                // Warm glow around guitar to make it prominent
                ctx.save();
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 20;
                Sprites.drawGuitar(ctx, dx, this.y, this.w, this.h);
                ctx.restore();
                // Label
                ctx.fillStyle = '#ffe66d';
                ctx.font = '7px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText("Whit's Guitar", dx + this.w / 2, this.y + this.h + 12);
                ctx.textAlign = 'left';
                break;
        }

        // Interaction prompt
        if (this.promptVisible && !this.interacted) {
            const promptY = this.y - 25 + Math.sin(this.animTimer / 300) * 3;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(dx + this.w / 2 - 30, promptY - 4, 60, 20, 4);
            ctx.fill();
            ctx.fillStyle = '#ffe66d';
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('Press E', dx + this.w / 2, promptY + 10);
            ctx.textAlign = 'left';
        }
    }
}
