/* ============================================
   WhitWorld — Sprite System
   Pixel art character & object sprites drawn on canvas
   ============================================ */

const Sprites = (() => {
    const cache = {};

    // Color palettes
    const PAL = {
        // Ingrid (big sister - 8yo girl)
        ingrid_hair: '#f5d442',      // blonde hair (was dark brown)
        ingrid_hair_hi: '#ffe066',   // hair highlight
        ingrid_skin: '#fdbcb4',      // skin
        ingrid_skin_shadow: '#e8a090',
        ingrid_shirt: '#ff6b9d',     // pink shirt
        ingrid_shirt_dark: '#e0507a',
        ingrid_pants: '#3b5998',     // blue pants
        ingrid_pants_dark: '#2d4373',
        ingrid_shoes: '#ff6b9d',
        ingrid_eyes: '#2d1b0e',

        // Whit (little brother - 4yo boy)
        whit_hair: '#f5d442',        // blonde hair
        whit_hair_hi: '#ffe066',
        whit_skin: '#fdbcb4',
        whit_skin_shadow: '#e8a090',
        whit_shirt: '#4ecdc4',       // teal shirt
        whit_shirt_dark: '#3aada5',
        whit_pants: '#555',          // dark pants
        whit_pants_dark: '#3a3a3a',
        whit_shoes: '#4ecdc4',
        whit_eyes: '#2d1b0e',

        // Objects
        washer_body: '#d4d4d8',
        washer_dark: '#a1a1aa',
        washer_glass: '#93c5fd',
        ball_orange: '#f97316',
        ball_dark: '#c2410c',
        toy_red: '#ef4444',
        toy_blue: '#3b82f6',
        couch_brown: '#92400e',
        couch_light: '#b45309',
        cooler_blue: '#1d4ed8',
        cooler_light: '#3b82f6',
        guitar_wood: '#92400e',
        guitar_light: '#b45309',
        battery_green: '#22c55e',
        battery_dark: '#15803d',
        floor: '#4a3728',
        wall: '#6b5b4f',
    };

    // Draw a pixel art sprite from a grid definition
    function drawFromGrid(ctx, x, y, grid, palette, scale = 1) {
        const pixelSize = scale;
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const colorKey = grid[row][col];
                if (colorKey && colorKey !== '.' && palette[colorKey]) {
                    ctx.fillStyle = palette[colorKey];
                    ctx.fillRect(
                        x + col * pixelSize,
                        y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }

    // Character sprite grids (16x24 pixels)
    // Legend: h=hair, H=hair highlight, s=skin, S=skin shadow, 
    //         t=shirt, T=shirt dark, p=pants, P=pants dark, 
    //         e=eyes, o=shoes, .=transparent

    const INGRID_STAND = [
        '....hhhh....',
        '...hhhhhh...',
        'hh.HhhhHhh..', // Ponytail added
        'hhhhhhhhhh..',
        '..sssssss...',
        '..sesSseS...',
        '..ssssssss..',
        '...ssMss....',
        '....tttt....',
        '...tttttt...',
        '..tttttttt..',
        '..tttttttt..',
        '..tTttttTt..',
        '...tttttt...',
        '...pppppp...',
        '..pppppppp..',
        '..pppppppp..',
        '..pp....pp..',
        '..pp....pp..',
        '..oo....oo..',
    ];

    const INGRID_RUN1 = [
        '....hhhh....',
        '...hhhhhh...',
        'hh.HhhhHhh..', // Ponytail
        'hhhhhhhhhh..',
        '..sssssss...',
        '..sesSseS...',
        '..ssssssss..',
        '...ssMss....',
        '....tttt....',
        '...tttttt...',
        '..tttttttt..',
        '..tttttttt..',
        '..tTttttTt..',
        '...tttttt...',
        '...pppppp...',
        '..pp..pppp..',
        '..pp....pp..',
        '.pp......pp.',
        '.oo......oo.',
        '............',
    ];

    const INGRID_RUN2 = [
        '....hhhh....', // Ponytail bounces
        '...hhhhhh...',
        '.hHHhhhHhh..',
        'hhhhhhhhhh..', // Ponytail
        'hhhhhhhhss..',
        '..sesSseS...',
        '..ssssssss..',
        '...ssMss....',
        '....tttt....',
        '...tttttt...',
        '..tttttttt..',
        '..tttttttt..',
        '..tTttttTt..',
        '...tttttt...',
        '..pppppp....',
        '..pppp..pp..',
        '..pp....pp..',
        '.pp......pp.',
        '............',
        '.oo......oo.',
    ];

    const INGRID_JUMP = [
        '....hhhh....', // Ponytail flies up
        '..hhhhhhh...',
        'hh.HhhhHhh..',
        'hh.hhhhhhh..',
        '..ssssssss..',
        '..sesSseS...',
        '..ssssssss..',
        '...ssWss....',
        's...tttt...s',
        'ss.tttttt.ss',
        'sstttttttss.',
        '..tttttttt..',
        '..tTttttTt..',
        '...tttttt...',
        '...pppppp...',
        '..pppppppp..',
        '.pp......pp.',
        '.oo......oo.',
        '............',
        '............',
    ];

    const WHIT_STAND = [
        '..hhhhhh..',
        '.hHhhhhHh.',
        '.hhhhhhhh.',
        '.ssssssss.',
        '.sesSseS..',
        '.ssssssss.',
        '..ssMss...',
        '...tttt...',
        '..tttttt..',
        '..tttttt..',
        '..tTttTt..',
        '..tttttt..',
        '..pppppp..',
        '..pp..pp..',
        '..pp..pp..',
        '..oo..oo..',
    ];

    const WHIT_CRY = [
        '..hhhhhh..',
        '.hHhhhhHh.',
        '.hhhhhhhh.',
        '.ssssssss.',
        '.s>sss<s..',
        '.ssssssss.',
        '..ssWWss..',
        '..b.tt.b..',
        '..tttttt..',
        '..tttttt..',
        '..tTttTt..',
        '..tttttt..',
        '..pppppp..',
        '..pp..pp..',
        '..pp..pp..',
        '..oo..oo..',
    ];

    const WHIT_HAPPY = [
        '..hhhhhh..',
        '.hHhhhhHh.',
        '.hhhhhhhh.',
        '.ssssssss.',
        '.sesSseS..',
        '.ssssssss.',
        '..ssUUss..',
        '...tttt...',
        '..tttttt..',
        's.tttttt.s',
        'sstTttTtss',
        '..tttttt..',
        '..pppppp..',
        '..pp..pp..',
        '..pp..pp..',
        '..oo..oo..',
    ];

    const WHIT_CHASE = [
        '..hhhhhh..',
        '.hHhhhhHh.',
        '.hhhhhhhh.',
        '.ssssssss.',
        '.sesSseS..',
        '.ssssssss.',
        '..ssOss...',
        '...tttt...',
        '..tttttt..',
        '..tttttt..',
        '..tTttTt..',
        '..tttttt..',
        '..pppp.pp.',
        '.pp....pp.',
        '.pp.....p.',
        '.oo....oo.',
    ];

    // Map color codes in grids to actual palette colors
    function getIngridPalette() {
        return {
            'h': PAL.ingrid_hair,
            'H': PAL.ingrid_hair_hi,
            's': PAL.ingrid_skin,
            'S': PAL.ingrid_skin_shadow,
            'e': PAL.ingrid_eyes,
            't': PAL.ingrid_shirt,
            'T': PAL.ingrid_shirt_dark,
            'p': PAL.ingrid_pants,
            'P': PAL.ingrid_pants_dark,
            'o': PAL.ingrid_shoes,
            'M': PAL.ingrid_skin_shadow, // mouth
            'W': PAL.ingrid_skin_shadow, // open mouth
        };
    }

    function getWhitPalette() {
        return {
            'h': PAL.whit_hair,
            'H': PAL.whit_hair_hi,
            's': PAL.whit_skin,
            'S': PAL.whit_skin_shadow,
            'e': PAL.whit_eyes,
            't': PAL.whit_shirt,
            'T': PAL.whit_shirt_dark,
            'p': PAL.whit_pants,
            'P': PAL.whit_pants_dark,
            'o': PAL.whit_shoes,
            'M': PAL.whit_skin_shadow,
            'W': '#fff',          // open mouth teeth
            'U': '#ef4444',       // smile
            'O': '#333',          // O mouth (surprised)
            'b': '#60a5fa',       // tears
            '>': '#333',          // squint eyes
            '<': '#333',
        };
    }

    // Pre-render a sprite to an offscreen canvas and cache it
    function renderSprite(name, grid, palette, scale) {
        const key = `${name}_${scale}`;
        if (cache[key]) return cache[key];

        const maxCols = Math.max(...grid.map(r => r.length));
        const rows = grid.length;
        const canvas = document.createElement('canvas');
        canvas.width = maxCols * scale;
        canvas.height = rows * scale;
        const ctx = canvas.getContext('2d');
        drawFromGrid(ctx, 0, 0, grid, palette, scale);
        cache[key] = canvas;
        return canvas;
    }

    // Get Ingrid sprite for a given state
    function getIngrid(state, scale = 3) {
        const pal = getIngridPalette();
        switch (state) {
            case 'run1': return renderSprite('ingrid_run1', INGRID_RUN1, pal, scale);
            case 'run2': return renderSprite('ingrid_run2', INGRID_RUN2, pal, scale);
            case 'jump': return renderSprite('ingrid_jump', INGRID_JUMP, pal, scale);
            default: return renderSprite('ingrid_stand', INGRID_STAND, pal, scale);
        }
    }

    // Get Whit sprite for a given state
    function getWhit(state, scale = 3) {
        const pal = getWhitPalette();
        switch (state) {
            case 'cry': return renderSprite('whit_cry', WHIT_CRY, pal, scale);
            case 'happy': return renderSprite('whit_happy', WHIT_HAPPY, pal, scale);
            case 'chase': return renderSprite('whit_chase', WHIT_CHASE, pal, scale);
            default: return renderSprite('whit_stand', WHIT_STAND, pal, scale);
        }
    }

    // Draw obstacles
    function drawSoccerBall(ctx, x, y, size) {
        // Orange soccer ball
        ctx.fillStyle = PAL.ball_orange;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Dark patches
        ctx.fillStyle = PAL.ball_dark;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 3, size / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size / 3, y + size * 0.65, size / 7, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x + size * 0.35, y + size * 0.35, size / 6, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawToy(ctx, x, y, w, h, color) {
        // Generic toy block
        ctx.fillStyle = color || PAL.toy_red;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 2, y + 2, w * 0.4, h * 0.3);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    function drawCouch(ctx, x, y, w, h) {
        // Brown couch
        ctx.fillStyle = PAL.couch_brown;
        ctx.fillRect(x, y, w, h);
        // Cushions
        ctx.fillStyle = PAL.couch_light;
        ctx.fillRect(x + 4, y + 4, w - 8, h * 0.5);
        // Arms
        ctx.fillStyle = PAL.couch_brown;
        ctx.fillRect(x, y, 8, h);
        ctx.fillRect(x + w - 8, y, 8, h);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 4, y + 4, w - 8, 4);
    }

    function drawCooler(ctx, x, y, w, h) {
        ctx.fillStyle = PAL.cooler_blue;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = PAL.cooler_light;
        ctx.fillRect(x + 2, y + 2, w - 4, 4);
        // Handle
        ctx.fillStyle = '#999';
        ctx.fillRect(x + w * 0.3, y - 4, w * 0.4, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 2, y + 2, w - 4, h * 0.3);
    }

    function drawWashingMachine(ctx, x, y, w, h) {
        // Body
        ctx.fillStyle = PAL.washer_body;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = PAL.washer_dark;
        ctx.fillRect(x, y, w, 6);
        // Door/Glass circle
        ctx.fillStyle = PAL.washer_glass;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.55, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAL.washer_dark;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Highlight on glass
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x + w * 0.4, y + h * 0.45, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Buttons
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i === 0 ? '#22c55e' : PAL.washer_dark;
            ctx.beginPath();
            ctx.arc(x + 12 + i * 14, y + 12, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGuitar(ctx, x, y, w, h) {
        // Guitar body
        ctx.fillStyle = PAL.guitar_wood;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5, y + h * 0.65, w * 0.4, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Neck
        ctx.fillStyle = PAL.guitar_light;
        ctx.fillRect(x + w * 0.4, y, w * 0.2, h * 0.5);
        // Strings
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x + w * 0.42 + i * 4, y);
            ctx.lineTo(x + w * 0.42 + i * 4, y + h * 0.85);
            ctx.stroke();
        }
        // Sound hole
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.65, w * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBattery(ctx, x, y, w, h) {
        ctx.fillStyle = PAL.battery_green;
        ctx.fillRect(x, y + 4, w, h - 4);
        // Top terminal
        ctx.fillStyle = PAL.battery_dark;
        ctx.fillRect(x + w * 0.3, y, w * 0.4, 6);
        // Plus sign
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + w * 0.35, y + h * 0.35, w * 0.3, 3);
        ctx.fillRect(x + w * 0.45, y + h * 0.25, 3, h * 0.3);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 2, y + 6, w * 0.3, h - 10);
    }

    function drawBatteryDrawer(ctx, x, y, w, h) {
        // Drawer
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#6B5335';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        // Handle
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(x + w * 0.35, y + h * 0.4, w * 0.3, 4);
        // Label
        ctx.fillStyle = '#FFE66D';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('BATT', x + 4, y + h - 6);
    }

    function drawLaundryPile(ctx, x, y, w, h) {
        // Messy laundry pile
        const colors = ['#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f97316'];
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.ellipse(
                x + w * 0.2 + Math.random() * w * 0.6,
                y + h * 0.3 + Math.random() * h * 0.6,
                w * 0.2 + Math.random() * 8,
                h * 0.15 + Math.random() * 5,
                Math.random() * Math.PI,
                0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    // Clear sprite cache
    function clearCache() {
        for (const key in cache) {
            delete cache[key];
        }
    }

    return {
        getIngrid,
        getWhit,
        drawSoccerBall,
        drawToy,
        drawCouch,
        drawCooler,
        drawWashingMachine,
        drawGuitar,
        drawBattery,
        drawBatteryDrawer,
        drawLaundryPile,
        drawFromGrid,
        clearCache,
        PAL
    };
})();
