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
        // =========================================
        // Virtual Joystick (Left / Right Movement)
        // =========================================
        const stickZone = document.getElementById('joystick-zone');
        const stick = document.getElementById('joystick-stick');

        if (stickZone && stick) {
            let startX = 0, startY = 0;
            let currentX = 0, currentY = 0;
            let dragging = false;
            const maxRadius = 35; // Max distance stick can move

            const handleStart = (clientX, clientY) => {
                const rect = stickZone.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                dragging = true;
                handleMove(clientX, clientY, centerX, centerY);
            };

            const handleMove = (clientX, clientY, centerX, centerY) => {
                if (!dragging) return;

                // If centerX is not provided (e.g. touchmove), recalculate
                if (!centerX) {
                    const rect = stickZone.getBoundingClientRect();
                    centerX = rect.left + rect.width / 2;
                    centerY = rect.top + rect.height / 2;
                }

                let dx = clientX - centerX;
                let dy = clientY - centerY;

                // Cap magnitude
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > maxRadius) {
                    const ratio = maxRadius / distance;
                    dx *= ratio;
                    dy *= ratio;
                }

                // Move visual stick
                stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                // Update input state (deadzone 10px)
                touchState.left = dx < -10;
                touchState.right = dx > 10;
                touchState.up = dy < -10; // For ladders if needed
                touchState.down = dy > 10;

                // For menus, we might want justPressed, but D-pad is usually continuous
                if (touchState.left) justPressed['left'] = true;
                if (touchState.right) justPressed['right'] = true;
                if (touchState.up) justPressed['up'] = true;
                if (touchState.down) justPressed['down'] = true;
            };

            const handleEnd = () => {
                dragging = false;
                stick.style.transform = 'translate(-50%, -50%)';
                touchState.left = false;
                touchState.right = false;
                touchState.up = false;
                touchState.down = false;
            };

            // Touch Listeners
            stickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleStart(touch.clientX, touch.clientY);
            }, { passive: false });

            stickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }, { passive: false });

            stickZone.addEventListener('touchend', handleEnd);
            stickZone.addEventListener('touchcancel', handleEnd);

            // Mouse Listeners (for testing)
            stickZone.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleStart(e.clientX, e.clientY);
            });
            window.addEventListener('mousemove', (e) => {
                if (dragging) {
                    e.preventDefault();
                    handleMove(e.clientX, e.clientY);
                }
            });
            window.addEventListener('mouseup', handleEnd);
        }

        // =========================================
        // Action Buttons (Jump / Interact)
        // =========================================
        document.querySelectorAll('.touch-btn[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            const pressHandler = (e) => {
                if (e.cancelable) e.preventDefault();
                touchState[action] = true;
                justPressed[action] = true;
                btn.classList.add('active'); // Add visual feedback class if needed
            };

            const releaseHandler = (e) => {
                if (e.cancelable) e.preventDefault();
                touchState[action] = false;
                btn.classList.remove('active');
            };

            // Touch events
            btn.addEventListener('touchstart', pressHandler, { passive: false });
            btn.addEventListener('touchend', releaseHandler);
            btn.addEventListener('touchcancel', releaseHandler);

            // Mouse events
            btn.addEventListener('mousedown', pressHandler);
            btn.addEventListener('mouseup', releaseHandler);
            btn.addEventListener('mouseleave', releaseHandler);
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
                return justPressed['Space'] || justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['jump'];
            case 'interact':
                return justPressed['KeyE'] || justPressed['KeyF'] || justPressed['interact'];
            case 'pause':
                return justPressed['Escape'] || justPressed['KeyP'] || justPressed['pause'];
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
