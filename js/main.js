/* ============================================
   WhitWorld — Main Entry Point
   Bootstraps all systems on page load
   ============================================ */

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Initialize systems
    InputSystem.init();
    GameEngine.init();
    UI.init();

    console.log('%c🎮 WhitWorld loaded! Help your little bro! 🎮',
        'color: #ff6b9d; font-size: 16px; font-weight: bold;');

    // Handle first interaction (needed for Web Audio)
    let audioUnlocked = false;
    const unlockAudio = () => {
        if (!audioUnlocked) {
            AudioSystem.init();
            audioUnlocked = true;
        }
    };
    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
});
