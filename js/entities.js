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

        const sprite = Sprites.getIngrid(this.state, 3);
        const drawX = this.x - cameraX;

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(drawX + this.w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, this.y);
        } else {
            ctx.drawImage(sprite, drawX, this.y);
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
                // Slow down when further away, speed up when close
                const dist = Math.abs(dx);
                const speedMult = dist < 150 ? 1.0 : 0.75;
                this.vx = this.chaseSpeed * dir * speedMult;
                this.x += this.vx;
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
        const sprite = Sprites.getWhit(this.state, 3);
        const drawX = this.x - cameraX;

        // Draw Whit
        ctx.save();
        if (this.behavior === 'chasing' && this.vx < 0) {
            ctx.translate(drawX + this.w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, this.y);
        } else {
            ctx.drawImage(sprite, drawX, this.y);
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
                // Top edge
                ctx.fillStyle = '#5a4838';
                ctx.fillRect(dx, this.y, this.w, 3);
                break;
            case 'shelf':
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(dx, this.y, this.w, this.h);
                ctx.fillStyle = '#6B5335';
                ctx.fillRect(dx, this.y + this.h - 3, this.w, 3);
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(dx, this.y, this.w, 2);
                break;
            case 'stairs':
                ctx.fillStyle = '#7c6c5c';
                ctx.fillRect(dx, this.y, this.w, this.h);
                ctx.fillStyle = '#6b5b4f';
                ctx.fillRect(dx, this.y, this.w, 2);
                break;
            case 'counter':
                ctx.fillStyle = '#a0855c';
                ctx.fillRect(dx, this.y, this.w, this.h);
                ctx.fillStyle = '#876f4c';
                ctx.fillRect(dx, this.y + 4, this.w, this.h - 4);
                // Counter top highlight
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(dx, this.y, this.w, 3);
                break;
            default:
                ctx.fillStyle = '#666';
                ctx.fillRect(dx, this.y, this.w, this.h);
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
                ctx.fillStyle = '#ffe66d';
                ctx.font = `${this.w}px sans-serif`;
                ctx.fillText('⭐', dx, bobY + this.h);
                break;
            case 'heart':
                ctx.fillStyle = '#ef4444';
                ctx.font = `${this.w}px sans-serif`;
                ctx.fillText('❤️', dx, bobY + this.h);
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
