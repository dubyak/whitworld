/* ============================================
   WhitWorld — UI System
   Screen management, buttons, music panel
   ============================================ */

const UI = (() => {
    let currentScreen = 'title';

    function init() {
        setupTitleScreen();
        setupHowToPlay();
        setupSelectScreen();
        setupMusicPanel();
        setupPauseOverlay();
        setupWinOverlay();
        setupLoseOverlay();
        drawTitleCharacters();
    }

    // =========================================
    // Title Screen
    // =========================================
    function setupTitleScreen() {
        document.getElementById('btn-start').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            showScreen('select');
        });

        document.getElementById('btn-how-to-play').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            showScreen('howto');
        });
    }

    // =========================================
    // How to Play
    // =========================================
    function setupHowToPlay() {
        document.getElementById('btn-howto-back').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            showScreen('title');
        });
    }

    // =========================================
    // Challenge Select
    // =========================================
    function setupSelectScreen() {
        // Difficulty toggle
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                GameEngine.difficulty = btn.dataset.diff;
                AudioSystem.playSFX('button');
            });
        });

        // Play buttons
        document.querySelectorAll('.btn-play').forEach(btn => {
            btn.addEventListener('click', () => {
                const challenge = parseInt(btn.dataset.challenge);
                AudioSystem.playSFX('button');
                AudioSystem.init();
                showScreen(null);
                setTimeout(() => {
                    GameEngine.startLevel(challenge, GameEngine.difficulty);
                }, 300);
            });
        });

        // Back button
        document.getElementById('btn-select-back').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            showScreen('title');
        });

        // Draw preview canvases
        drawLevelPreviews();
    }

    // =========================================
    // Music Panel
    // =========================================
    function setupMusicPanel() {
        const toggleBtn = document.getElementById('btn-music-toggle');
        const dropdown = document.getElementById('music-dropdown');

        toggleBtn.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
            AudioSystem.init();
            AudioSystem.toggleMusic();
        });

        // Track selection
        document.querySelectorAll('.music-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AudioSystem.switchTrack(btn.dataset.track);
                AudioSystem.playSFX('button');
            });
        });

        // Volume slider
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            AudioSystem.setVolume(e.target.value / 100);
        });

        // Close dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.music-panel')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // =========================================
    // Pause Overlay
    // =========================================
    function setupPauseOverlay() {
        document.getElementById('btn-resume').addEventListener('click', () => {
            GameEngine.resumeGame();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            document.getElementById('pause-overlay').classList.add('hidden');
            AudioSystem.playSFX('button');
            GameEngine.endLevel();
            setTimeout(() => {
                GameEngine.startLevel(GameEngine.currentChallenge, GameEngine.difficulty);
            }, 200);
        });

        document.getElementById('btn-quit').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            GameEngine.endLevel();
            showScreen('select');
        });

        document.getElementById('btn-pause').addEventListener('click', () => {
            if (GameEngine.gameState === 'playing') {
                GameEngine.pauseGame();
            }
        });
    }

    // =========================================
    // Win Overlay
    // =========================================
    function setupWinOverlay() {
        document.getElementById('btn-win-next').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            document.getElementById('win-overlay').classList.add('hidden');
            GameEngine.endLevel();
            const nextChallenge = GameEngine.currentChallenge + 1;
            setTimeout(() => {
                GameEngine.startLevel(nextChallenge, GameEngine.difficulty);
            }, 300);
        });

        document.getElementById('btn-win-menu').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            GameEngine.endLevel();
            showScreen('select');
        });
    }

    // =========================================
    // Lose Overlay
    // =========================================
    function setupLoseOverlay() {
        document.getElementById('btn-lose-retry').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            document.getElementById('lose-overlay').classList.add('hidden');
            GameEngine.endLevel();
            setTimeout(() => {
                GameEngine.startLevel(GameEngine.currentChallenge, GameEngine.difficulty);
            }, 200);
        });

        document.getElementById('btn-lose-menu').addEventListener('click', () => {
            AudioSystem.playSFX('button');
            GameEngine.endLevel();
            showScreen('select');
        });
    }

    // =========================================
    // Screen Management
    // =========================================
    function showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        if (screenName) {
            const screen = document.getElementById(`${screenName}-screen`);
            if (screen) screen.classList.add('active');
            currentScreen = screenName;
        }
    }

    // =========================================
    // Title Screen Character Previews
    // =========================================
    function drawTitleCharacters() {
        // Draw Ingrid
        const ingridCanvas = document.getElementById('title-ingrid');
        if (ingridCanvas) {
            const ictx = ingridCanvas.getContext('2d');
            ictx.clearRect(0, 0, 64, 64);
            Sprites.drawIngrid(ictx, 8, 4, 'stand');
        }

        // Draw Whit
        const whitCanvas = document.getElementById('title-whit');
        if (whitCanvas) {
            const wctx = whitCanvas.getContext('2d');
            wctx.clearRect(0, 0, 48, 48);
            Sprites.drawWhit(wctx, 5, 2, 'happy');
        }
    }

    // =========================================
    // Level Previews
    // =========================================
    function drawLevelPreviews() {
        // Preview 1: Basement with washing machine
        const p1 = document.getElementById('preview-1');
        if (p1) {
            const pctx = p1.getContext('2d');
            pctx.fillStyle = '#1a1520';
            pctx.fillRect(0, 0, 280, 120);

            // Ground
            pctx.fillStyle = '#4a3728';
            pctx.fillRect(0, 95, 280, 25);

            // Obstacles
            Sprites.drawSoccerBall(pctx, 40, 75, 20);
            Sprites.drawToy(pctx, 80, 80, 20, 15, '#ef4444');
            Sprites.drawCouch(pctx, 120, 60, 50, 35);

            // Washing machine at end
            Sprites.drawWashingMachine(pctx, 220, 50, 45, 45);

            // Mini Ingrid
            Sprites.drawIngrid(pctx, 10, 58, 'run1');

            // Mini Whit (crying next to washer)
            Sprites.drawWhit(pctx, 235, 60, 'cry');

            // Arrow
            pctx.fillStyle = '#ffe66d';
            pctx.font = '16px sans-serif';
            pctx.fillText('→', 185, 80);
        }

        // Preview 2: House with guitar
        const p2 = document.getElementById('preview-2');
        if (p2) {
            const pctx = p2.getContext('2d');
            pctx.fillStyle = '#1a1a2e';
            pctx.fillRect(0, 0, 280, 120);

            // Two floor levels
            pctx.fillStyle = '#4a3728';
            pctx.fillRect(0, 55, 120, 5);   // Upper floor
            pctx.fillRect(0, 95, 280, 25);   // Lower floor

            // Stairs
            pctx.fillStyle = '#7c6c5c';
            for (let i = 0; i < 4; i++) {
                pctx.fillRect(120 + i * 15, 55 + i * 10, 15, 10);
            }

            // Guitar
            Sprites.drawGuitar(pctx, 20, 25, 18, 30);

            // Battery at end
            Sprites.drawBattery(pctx, 250, 70, 12, 20);

            // Mini Ingrid
            Sprites.drawIngrid(pctx, 50, 20, 'run1');

            // Mini Whit chasing
            Sprites.drawWhit(pctx, 80, 22, 'chase');

            // Arrow
            pctx.fillStyle = '#ffe66d';
            pctx.font = '16px sans-serif';
            pctx.fillText('→', 160, 80);
        }
    }

    return { init, showScreen };
})();
