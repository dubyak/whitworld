/* ============================================
   WhitWorld — Level Definitions
   Challenge 1: Washing Machine Rescue
   Challenge 2: Battery Run
   ============================================ */

const Levels = (() => {

    const TILE = 40; // Base tile size

    // Helper: generate platforms at regular intervals with variety
    function generatePlatforms(startX, endX, groundY, spacing, type) {
        const plats = [];
        const heights = [65, 75, 80, 90, 100, 110, 120];
        const widths = [110, 130, 150, 160, 180, 200];
        let x = startX;
        let i = 0;
        while (x < endX) {
            const h = heights[i % heights.length];
            const w = widths[i % widths.length];
            plats.push(new Platform(x, groundY - h, w, 15, type));
            x += spacing + (i % 3) * 40;
            i++;
        }
        return plats;
    }

    // Helper: generate obstacles with variety
    function generateObstacles(startX, endX, groundY, spacing) {
        const obs = [];
        const types = [
            { type: 'soccer', w: 30, h: 30 },
            { type: 'toy_red', w: 35, h: 25 },
            { type: 'toy_blue', w: 30, h: 20 },
            { type: 'couch', w: 100, h: 50 },
            { type: 'cooler', w: 50, h: 40 },
            { type: 'toy_purple', w: 35, h: 25 },
            { type: 'laundry', w: 50, h: 30 },
        ];
        let x = startX;
        let i = 0;
        while (x < endX) {
            const t = types[i % types.length];
            obs.push(new Obstacle(x, groundY - t.h, t.w, t.h, t.type));
            x += spacing + (i % 4) * 30;
            i++;
        }
        return obs;
    }

    // =========================================
    // CHALLENGE 1: Washing Machine Rescue
    // Navigate the messy basement to save Whit
    // =========================================
    function createLevel1(canvasH, difficulty) {
        const groundY = canvasH - 60;
        const levelWidth = 12800; // 4x original

        // Difficulty settings
        const settings = {
            easy: { timer: 300, obstacles: 0.5, rollingSpeed: 1.2, rollingInterval: 6000, lives: 5 },
            normal: { timer: 180, obstacles: 0.75, rollingSpeed: 2.0, rollingInterval: 4000, lives: 3 },
            hard: { timer: 100, obstacles: 1.0, rollingSpeed: 3.0, rollingInterval: 2500, lives: 2 },
        };
        const s = settings[difficulty] || settings.normal;

        // Main ground platform spanning entire level
        const platforms = [
            new Platform(0, groundY, levelWidth, 60, 'ground'),
        ];

        // Generate shelves across the full level length
        // Zone 1: Cozy start (300–3000)
        platforms.push(
            new Platform(300, groundY - 95, 160, 15, 'shelf'),
            new Platform(600, groundY - 120, 140, 15, 'shelf'),
            new Platform(900, groundY - 90, 150, 15, 'shelf'),
            new Platform(1200, groundY - 110, 180, 15, 'shelf'),
            new Platform(1550, groundY - 95, 140, 15, 'shelf'),
            new Platform(1800, groundY - 115, 160, 15, 'shelf'),
            new Platform(2100, groundY - 100, 130, 15, 'shelf'),
            new Platform(2400, groundY - 110, 200, 15, 'shelf'),
            new Platform(2700, groundY - 90, 120, 15, 'shelf'),
        );
        // Zone 2: Tighter platforming (3000–6000)
        platforms.push(
            new Platform(3100, groundY - 95, 130, 15, 'shelf'),
            new Platform(3400, groundY - 110, 150, 15, 'shelf'),
            new Platform(3700, groundY - 90, 120, 15, 'shelf'),
            new Platform(4000, groundY - 105, 180, 15, 'shelf'),
            new Platform(4350, groundY - 95, 160, 15, 'shelf'),
            new Platform(4650, groundY - 120, 140, 15, 'shelf'),
            new Platform(4950, groundY - 90, 130, 15, 'shelf'),
            new Platform(5250, groundY - 95, 200, 15, 'shelf'),
            new Platform(5550, groundY - 110, 150, 15, 'shelf'),
            new Platform(5850, groundY - 95, 120, 15, 'shelf'),
        );
        // Zone 3: More challenging (6000–9000)
        platforms.push(
            new Platform(6100, groundY - 90, 140, 15, 'shelf'),
            new Platform(6400, groundY - 115, 130, 15, 'shelf'),
            new Platform(6750, groundY - 95, 160, 15, 'shelf'),
            new Platform(7050, groundY - 100, 180, 15, 'shelf'),
            new Platform(7400, groundY - 90, 150, 15, 'shelf'),
            new Platform(7700, groundY - 95, 120, 15, 'shelf'),
            new Platform(8000, groundY - 110, 200, 15, 'shelf'),
            new Platform(8350, groundY - 90, 140, 15, 'shelf'),
            new Platform(8650, groundY - 100, 160, 15, 'shelf'),
        );
        // Zone 4: Final stretch (9000–12800)
        platforms.push(
            new Platform(9100, groundY - 95, 150, 15, 'shelf'),
            new Platform(9450, groundY - 105, 130, 15, 'shelf'),
            new Platform(9750, groundY - 90, 180, 15, 'shelf'),
            new Platform(10100, groundY - 95, 160, 15, 'shelf'),
            new Platform(10450, groundY - 110, 140, 15, 'shelf'),
            new Platform(10800, groundY - 90, 200, 15, 'shelf'),
            new Platform(11100, groundY - 100, 130, 15, 'shelf'),
            new Platform(11450, groundY - 95, 150, 15, 'shelf'),
            new Platform(11800, groundY - 115, 160, 15, 'shelf'),
            new Platform(12100, groundY - 90, 180, 15, 'shelf'),
        );

        // Obstacles across the entire level
        const obstacles = [
            // Zone 1 (clear start, first 350px free)
            new Obstacle(400, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(650, groundY - 25, 35, 25, 'toy_red'),
            new Obstacle(850, groundY - 50, 100, 50, 'couch'),
            new Obstacle(1100, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(1350, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(1600, groundY - 25, 35, 25, 'toy_purple'),
            new Obstacle(1900, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(2150, groundY - 50, 100, 50, 'couch'),
            new Obstacle(2500, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(2750, groundY - 30, 50, 30, 'laundry'),
            // Zone 2
            new Obstacle(3050, groundY - 25, 35, 25, 'toy_red'),
            new Obstacle(3300, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(3550, groundY - 50, 100, 50, 'couch'),
            new Obstacle(3850, groundY - 20, 30, 20, 'toy_blue'),
            new Obstacle(4100, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(4400, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(4700, groundY - 25, 35, 25, 'toy_purple'),
            new Obstacle(4950, groundY - 50, 100, 50, 'couch'),
            new Obstacle(5200, groundY - 30, 50, 30, 'laundry'),
            new Obstacle(5500, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(5750, groundY - 30, 30, 30, 'soccer'),
            // Zone 3
            new Obstacle(6050, groundY - 25, 35, 25, 'toy_red'),
            new Obstacle(6350, groundY - 50, 100, 50, 'couch'),
            new Obstacle(6600, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(6900, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(7200, groundY - 25, 35, 25, 'toy_blue'),
            new Obstacle(7450, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(7700, groundY - 50, 100, 50, 'couch'),
            new Obstacle(8000, groundY - 25, 35, 25, 'toy_purple'),
            new Obstacle(8300, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(8550, groundY - 30, 50, 30, 'laundry'),
            // Zone 4
            new Obstacle(9000, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(9300, groundY - 50, 100, 50, 'couch'),
            new Obstacle(9600, groundY - 25, 35, 25, 'toy_red'),
            new Obstacle(9900, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(10200, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(10500, groundY - 25, 35, 25, 'toy_blue'),
            new Obstacle(10750, groundY - 50, 100, 50, 'couch'),
            new Obstacle(11000, groundY - 30, 50, 30, 'laundry'),
            new Obstacle(11300, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(11600, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(11900, groundY - 50, 100, 50, 'couch'),
            new Obstacle(12200, groundY - 25, 35, 25, 'toy_purple'),
        ];

        // Filter obstacles based on difficulty
        const filteredObstacles = obstacles.filter(() => Math.random() < s.obstacles);

        // Collectibles spread across entire level (~20 stars)
        const collectibles = [
            // Zone 1
            new Collectible(350, groundY - 120, 20, 20, 'star'),
            new Collectible(650, groundY - 160, 20, 20, 'star'),
            new Collectible(1250, groundY - 140, 20, 20, 'star'),
            new Collectible(1850, groundY - 155, 20, 20, 'star'),
            new Collectible(2450, groundY - 140, 20, 20, 'star'),
            // Zone 2
            new Collectible(3150, groundY - 130, 20, 20, 'star'),
            new Collectible(3750, groundY - 115, 20, 20, 'star'),
            new Collectible(4400, groundY - 120, 20, 20, 'star'),
            new Collectible(5000, groundY - 110, 20, 20, 'star'),
            new Collectible(5600, groundY - 135, 20, 20, 'star'),
            // Zone 3
            new Collectible(6150, groundY - 125, 20, 20, 'star'),
            new Collectible(6800, groundY - 110, 20, 20, 'star'),
            new Collectible(7450, groundY - 130, 20, 20, 'star'),
            new Collectible(8050, groundY - 150, 20, 20, 'star'),
            new Collectible(8700, groundY - 140, 20, 20, 'star'),
            // Zone 4
            new Collectible(9500, groundY - 145, 20, 20, 'star'),
            new Collectible(10150, groundY - 135, 20, 20, 'star'),
            new Collectible(10850, groundY - 115, 20, 20, 'star'),
            new Collectible(11500, groundY - 125, 20, 20, 'star'),
            new Collectible(12150, groundY - 120, 20, 20, 'star'),
        ];

        // Hearts (extra lives) spread across level
        if (difficulty !== 'easy') {
            collectibles.push(new Collectible(1500, groundY - 50, 20, 20, 'heart'));
            collectibles.push(new Collectible(4200, groundY - 50, 20, 20, 'heart'));
            collectibles.push(new Collectible(7000, groundY - 50, 20, 20, 'heart'));
            collectibles.push(new Collectible(9800, groundY - 50, 20, 20, 'heart'));
        }

        // Whit at the end (stuck in washing machine)
        const whit = new WhitNPC(levelWidth - 200, groundY - 80, 'stuck');
        whit.say("HELP! I'm stuck! 😭");

        // Washing machine interaction zone
        const washingMachine = new InteractionZone(
            levelWidth - 250, groundY - 90, 80, 90, 'washing_machine',
            (player) => {
                whit.behavior = 'idle';
                whit.state = 'happy';
                whit.say("YAY! Thanks Ingrid! 🎉");
                AudioSystem.playSFX('whit_happy');
                return 'win';
            }
        );

        return {
            name: "Washing Machine Rescue",
            width: levelWidth,
            timer: s.timer,
            lives: s.lives,
            theme: 'basement',
            bgColor: '#12101a',
            bgAccent: '#1e1828',
            platforms,
            obstacles: filteredObstacles,
            collectibles,
            interactionZones: [washingMachine],
            npcs: [whit],
            playerStart: { x: 50, y: groundY - 70 },
            rollingSpeed: s.rollingSpeed,
            rollingInterval: s.rollingInterval,
            winMessage: "You saved Whit from the washing machine! He's safe and sound! 🫧",
            loseMessage: "Oh no! Whit jumped out and bumped his knee! 😢",
            difficulty
        };
    }

    // =========================================
    // CHALLENGE 2: Battery Run
    // Get batteries before Whit catches you
    // =========================================
    function createLevel2(canvasH, difficulty) {
        const groundY = canvasH - 60;
        const levelWidth = 11200; // 4x original

        // Difficulty settings
        const settings = {
            easy: { whitSpeed: 1.4, maxCatches: 8, lives: 5 },
            normal: { whitSpeed: 2.5, maxCatches: 4, lives: 3 },
            hard: { whitSpeed: 3.5, maxCatches: 2, lives: 2 },
        };
        const s = settings[difficulty] || settings.normal;

        const downstairsY = groundY + 120; // Lower floor

        // Level layout: Upstairs rooms → Stairs → Long downstairs hallway/kitchen
        const platforms = [
            // ===== UPSTAIRS (0-3200) =====
            // Extend ground to negative for Whit spawn
            new Platform(-500, groundY, 3700, 60, 'ground'),
            // Bedroom furniture
            new Platform(150, groundY - 95, 130, 15, 'shelf'),
            new Platform(400, groundY - 105, 120, 15, 'shelf'),
            new Platform(600, groundY - 90, 140, 15, 'shelf'),
            // Hallway platforms
            new Platform(900, groundY - 95, 120, 15, 'shelf'),
            new Platform(1200, groundY - 110, 150, 15, 'shelf'),
            new Platform(1500, groundY - 90, 130, 15, 'shelf'),
            // Living room platforms
            new Platform(1800, groundY - 100, 160, 15, 'shelf'),
            new Platform(2100, groundY - 90, 140, 15, 'shelf'),
            new Platform(2400, groundY - 105, 130, 15, 'shelf'),
            new Platform(2700, groundY - 95, 150, 15, 'shelf'),
            new Platform(3000, groundY - 100, 120, 15, 'shelf'),

            // ===== STAIRS (3200-3600) =====
            new Platform(3200, groundY - 25, 80, 25, 'stairs'),
            new Platform(3280, groundY + 15, 80, 25, 'stairs'),
            new Platform(3360, groundY + 55, 80, 25, 'stairs'),
            new Platform(3440, groundY + 95, 80, 25, 'stairs'),

            // ===== DOWNSTAIRS (3520-11200) =====
            new Platform(3440, downstairsY, 7760, 60, 'ground'),

            // Hallway platforms
            new Platform(3700, downstairsY - 95, 140, 15, 'counter'),
            new Platform(4000, downstairsY - 90, 130, 15, 'shelf'),
            new Platform(4300, downstairsY - 105, 160, 15, 'counter'),
            new Platform(4650, downstairsY - 95, 120, 15, 'shelf'),
            // Dining room
            new Platform(5000, downstairsY - 95, 180, 15, 'counter'),
            new Platform(5350, downstairsY - 90, 150, 15, 'shelf'),
            new Platform(5700, downstairsY - 100, 140, 15, 'counter'),
            // Family room
            new Platform(6050, downstairsY - 95, 160, 15, 'shelf'),
            new Platform(6400, downstairsY - 100, 130, 15, 'counter'),
            new Platform(6750, downstairsY - 90, 150, 15, 'shelf'),
            // Kitchen area
            new Platform(7100, downstairsY - 95, 200, 15, 'counter'),
            new Platform(7500, downstairsY - 90, 140, 15, 'counter'),
            new Platform(7850, downstairsY - 105, 160, 15, 'counter'),
            // Laundry / utility room
            new Platform(8200, downstairsY - 90, 130, 15, 'shelf'),
            new Platform(8550, downstairsY - 95, 150, 15, 'counter'),
            new Platform(8900, downstairsY - 110, 180, 15, 'counter'),
            // Final stretch to battery
            new Platform(9300, downstairsY - 95, 140, 15, 'shelf'),
            new Platform(9650, downstairsY - 100, 160, 15, 'counter'),
            new Platform(10000, downstairsY - 90, 130, 15, 'shelf'),
            new Platform(10400, downstairsY - 105, 200, 15, 'counter'),
            new Platform(10800, downstairsY - 90, 150, 15, 'counter'),
        ];

        // Obstacles
        const obstacles = [
            // Upstairs
            new Obstacle(180, groundY - 25, 35, 25, 'toy_red'),
            new Obstacle(450, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(700, groundY - 25, 35, 25, 'toy_blue'),
            new Obstacle(1000, groundY - 50, 100, 50, 'couch'),
            new Obstacle(1350, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(1650, groundY - 25, 35, 25, 'toy_purple'),
            new Obstacle(1950, groundY - 40, 50, 40, 'cooler'),
            new Obstacle(2250, groundY - 30, 30, 30, 'soccer'),
            new Obstacle(2550, groundY - 50, 100, 50, 'couch'),
            new Obstacle(2850, groundY - 25, 35, 25, 'toy_red'),

            // Downstairs
            new Obstacle(3650, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(3950, downstairsY - 25, 35, 25, 'toy_red'),
            new Obstacle(4250, downstairsY - 40, 100, 40, 'couch'),
            new Obstacle(4550, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(4900, downstairsY - 25, 35, 25, 'toy_blue'),
            new Obstacle(5200, downstairsY - 50, 100, 50, 'couch'),
            new Obstacle(5500, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(5850, downstairsY - 40, 50, 40, 'cooler'),
            new Obstacle(6150, downstairsY - 25, 35, 25, 'toy_purple'),
            new Obstacle(6500, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(6800, downstairsY - 50, 100, 50, 'couch'),
            new Obstacle(7150, downstairsY - 25, 35, 25, 'toy_red'),
            new Obstacle(7450, downstairsY - 40, 50, 40, 'cooler'),
            new Obstacle(7800, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(8100, downstairsY - 25, 35, 25, 'toy_blue'),
            new Obstacle(8450, downstairsY - 50, 100, 50, 'couch'),
            new Obstacle(8800, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(9150, downstairsY - 40, 50, 40, 'cooler'),
            new Obstacle(9500, downstairsY - 25, 35, 25, 'toy_purple'),
            new Obstacle(9850, downstairsY - 30, 30, 30, 'soccer'),
            new Obstacle(10200, downstairsY - 50, 100, 50, 'couch'),
            new Obstacle(10550, downstairsY - 40, 50, 40, 'cooler'),
            new Obstacle(10850, downstairsY - 25, 35, 25, 'toy_red'),
        ];

        // Collectibles spread across entire level
        const collectibles = [
            // Upstairs
            new Collectible(200, groundY - 115, 20, 20, 'star'),
            new Collectible(450, groundY - 135, 20, 20, 'star'),
            new Collectible(950, groundY - 125, 20, 20, 'star'),
            new Collectible(1550, groundY - 115, 20, 20, 'star'),
            new Collectible(2150, groundY - 110, 20, 20, 'star'),
            new Collectible(2750, groundY - 120, 20, 20, 'star'),
            // Downstairs
            new Collectible(3750, downstairsY - 125, 20, 20, 'star'),
            new Collectible(4350, downstairsY - 135, 20, 20, 'star'),
            new Collectible(5050, downstairsY - 125, 20, 20, 'star'),
            new Collectible(5750, downstairsY - 140, 20, 20, 'star'),
            new Collectible(6450, downstairsY - 130, 20, 20, 'star'),
            new Collectible(7150, downstairsY - 125, 20, 20, 'star'),
            new Collectible(7900, downstairsY - 135, 20, 20, 'star'),
            new Collectible(8600, downstairsY - 125, 20, 20, 'star'),
            new Collectible(9350, downstairsY - 115, 20, 20, 'star'),
            new Collectible(10050, downstairsY - 120, 20, 20, 'star'),
            new Collectible(10850, downstairsY - 110, 20, 20, 'star'),
        ];

        // Hearts
        collectibles.push(new Collectible(1800, groundY - 50, 20, 20, 'heart'));
        collectibles.push(new Collectible(5400, downstairsY - 50, 20, 20, 'heart'));
        collectibles.push(new Collectible(8200, downstairsY - 50, 20, 20, 'heart'));

        // Guitar at start (visual context) — big and prominent
        const guitar = new InteractionZone(
            70, groundY - 70, 50, 70, 'guitar', null
        );
        guitar.interacted = true; // Can't interact, just visual

        // Whit chasing — starts closer to player (just off-screen left)
        const whit = new WhitNPC(-100, groundY - 50, 'chasing');
        whit.chaseSpeed = s.whitSpeed;
        whit.maxCatches = s.maxCatches;
        // Faster start
        if (difficulty === 'easy') {
            whit.chaseDelay = 3000;
        } else if (difficulty === 'normal') {
            whit.chaseDelay = 2000;
        } else {
            whit.chaseDelay = 1000;
        }
        whit.say("I WANT MY GUITAR! 😡");

        // Battery drawer at end of kitchen
        const batteryDrawer = new InteractionZone(
            levelWidth - 150, downstairsY - 60, 60, 60, 'battery_drawer',
            (player) => {
                whit.behavior = 'idle';
                whit.state = 'happy';
                whit.say("IT WORKS!! 🎸🎶");
                AudioSystem.playSFX('whit_happy');
                return 'win';
            }
        );

        // Battery collectible (must pick up first)
        const battery = new Collectible(levelWidth - 150, downstairsY - 40, 20, 30, 'battery');
        collectibles.push(battery);

        return {
            name: "Battery Run",
            width: levelWidth,
            timer: null, // No timer, catch-based
            lives: s.lives,
            theme: 'house',
            bgColor: '#141825',
            bgAccent: '#1a2035',
            platforms,
            obstacles,
            collectibles,
            interactionZones: [guitar, batteryDrawer],
            npcs: [whit],
            playerStart: { x: 50, y: groundY - 70 },
            maxCatches: s.maxCatches,
            winMessage: "You changed the batteries! Whit is rocking out! 🎸🎶",
            loseMessage: "Whit grabbed the guitar and ran away crying... 😭🎸",
            difficulty,
            startHolding: 'guitar'
        };
    }

    // Level factory
    function create(challengeNum, canvasH, difficulty) {
        switch (challengeNum) {
            case 1: return createLevel1(canvasH, difficulty);
            case 2: return createLevel2(canvasH, difficulty);
            default: return createLevel1(canvasH, difficulty);
        }
    }

    return { create };
})();
