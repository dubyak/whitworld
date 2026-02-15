/* ============================================
   WhitWorld — Input System
   Keyboard + Touch controls
   ============================================ */

const InputSystem = (() => {
    const keys = {};
    const justPressed = {};
    let touchState = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        interact: false
    };
    let isMobile = false;

    function init() {
        // Detect mobile
        isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (!keys[e.code]) {
                justPressed[e.code] = true;
            }
            keys[e.code] = true;
            // Prevent scrolling with game keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        // Setup touch controls (attach listeners regardless of device type)
        // This ensures if they are ever shown, they work.
        setupTouchControls();

        // Initial visibility check
        if (!isMobile) {
            hideTouchControls();
        }
    }

    function setupTouchControls() {
        // D-pad buttons
        document.querySelectorAll('.touch-btn[data-dir]').forEach(btn => {
            const dir = btn.dataset.dir;

            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchState[dir] = true;
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchState[dir] = false;
            });
            btn.addEventListener('touchcancel', () => {
                touchState[dir] = false;
            });

            // Mouse events (for testing/hybrid)
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                touchState[dir] = true;
            });
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                touchState[dir] = false;
            });
            btn.addEventListener('mouseleave', () => {
                touchState[dir] = false;
            });
        });

        // Action buttons
        document.querySelectorAll('.touch-btn[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchState[action] = true;
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchState[action] = false;
            });
            btn.addEventListener('touchcancel', () => {
                touchState[action] = false;
            });

            // Mouse events
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                touchState[action] = true;
            });
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                touchState[action] = false;
            });
            btn.addEventListener('mouseleave', () => {
                touchState[action] = false;
            });
        });
    }

    function showTouchControls() {
        const touchEl = document.getElementById('touch-controls');
        if (touchEl && isMobile) touchEl.classList.remove('hidden');
    }

    function hideTouchControls() {
        const touchEl = document.getElementById('touch-controls');
        if (touchEl) touchEl.classList.add('hidden');
    }

    function isDown(action) {
        switch (action) {
            case 'left':
                return keys['ArrowLeft'] || keys['KeyA'] || touchState.left;
            case 'right':
                return keys['ArrowRight'] || keys['KeyD'] || touchState.right;
            case 'up':
                return keys['ArrowUp'] || keys['KeyW'] || touchState.up;
            case 'down':
                return keys['ArrowDown'] || keys['KeyS'] || touchState.down;
            case 'jump':
                return keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchState.jump || touchState.up;
            case 'interact':
                return keys['KeyE'] || keys['KeyF'] || touchState.interact;
            case 'pause':
                return keys['Escape'] || keys['KeyP'];
            default:
                return false;
        }
    }

    function wasJustPressed(action) {
        switch (action) {
            case 'jump':
                return justPressed['Space'] || justPressed['ArrowUp'] || justPressed['KeyW'];
            case 'interact':
                return justPressed['KeyE'] || justPressed['KeyF'];
            case 'pause':
                return justPressed['Escape'] || justPressed['KeyP'];
            default:
                return false;
        }
    }

    function clearJustPressed() {
        for (const key in justPressed) {
            delete justPressed[key];
        }
        // Also clear touch "just pressed" flags
        // (touch is continuous, so jump/interact reset handled differently)
    }

    function getIsMobile() {
        return isMobile;
    }

    return {
        init,
        isDown,
        wasJustPressed,
        clearJustPressed,
        showTouchControls,
        hideTouchControls,
        getIsMobile
    };
})();
