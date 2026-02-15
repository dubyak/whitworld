/* ============================================
   WhitWorld — Audio System
   Chiptune music + Sound Effects using Web Audio API
   Each track is VERY different in feel.
   ============================================ */

const AudioSystem = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let currentTrack = 'adventure';
    let isPlaying = false;
    let musicInterval = null;
    let volume = 0.5;

    // Note frequencies
    const N = {
        C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
        G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
        C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
        Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
        C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46,
        Fs5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
        C6: 1046.50
    };

    // =============================
    // Track definitions — each very different
    // =============================
    const TRACKS = {
        adventure: {
            name: 'Adventure',
            bpm: 150,
            // Upbeat, heroic Mario-like melody
            melody: [
                'C5', 'E5', 'G5', 'C6', '_', 'G5', 'E5', 'C5',
                'D5', 'F5', 'A5', 'D5', '_', 'A5', 'F5', 'D5',
                'E5', 'G5', 'B5', 'E5', '_', 'B5', 'G5', 'E5',
                'C5', 'E5', 'G5', 'E5', 'D5', 'C5', '_', '_'
            ],
            bass: [
                'C3', '_', 'G3', '_', 'F3', '_', 'C3', '_',
                'D3', '_', 'A3', '_', 'E3', '_', 'G3', '_'
            ],
            // Drum pattern: kick on 1&3, snare on 2&4
            drums: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
            melodyWave: 'square',
            bassWave: 'triangle',
            melodyGain: 0.18,
            bassGain: 0.15,
        },
        chill: {
            name: 'Chill',
            bpm: 85,
            // Slow, dreamy, lots of sustained notes
            melody: [
                'E4', '_', '_', 'G4', '_', '_', 'B4', '_',
                '_', '_', 'A4', '_', '_', 'G4', '_', '_',
                'C4', '_', '_', 'E4', '_', '_', 'G4', '_',
                '_', '_', 'F4', '_', '_', 'E4', '_', '_'
            ],
            bass: [
                'E3', '_', '_', '_', 'C3', '_', '_', '_',
                'A3', '_', '_', '_', 'E3', '_', '_', '_'
            ],
            drums: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            melodyWave: 'sine',
            bassWave: 'sine',
            melodyGain: 0.12,
            bassGain: 0.10,
        },
        retro: {
            name: 'Retro',
            bpm: 180,
            // Fast, NES-style with rapid arpeggios
            melody: [
                'C5', 'E5', 'G5', 'C5', 'E5', 'G5', 'C5', '_',
                'Bb4', 'D5', 'F5', 'Bb4', 'D5', 'F5', 'Bb4', '_',
                'Ab4', 'C5', 'Eb5', 'Ab4', 'C5', 'Eb5', 'Ab4', '_',
                'G4', 'B4', 'D5', 'G4', 'B4', 'D5', 'G5', '_'
            ],
            bass: [
                'C3', 'C3', '_', 'C3', 'Bb3', 'Bb3', '_', 'Bb3',
                'Ab3', 'Ab3', '_', 'Ab3', 'G3', 'G3', '_', 'G3'
            ],
            drums: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            snare: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
            melodyWave: 'square',
            bassWave: 'square',
            melodyGain: 0.15,
            bassGain: 0.12,
        },
        funky: {
            name: 'Funky',
            bpm: 115,
            // Syncopated, groovy, funky bass-driven
            melody: [
                'E4', '_', 'G4', '_', 'A4', '_', 'G4', 'E4',
                '_', 'D4', '_', 'F4', '_', 'E4', 'D4', '_',
                'C4', '_', 'E4', '_', 'G4', '_', 'A4', 'G4',
                '_', 'F4', 'E4', '_', 'D4', '_', 'C4', '_'
            ],
            bass: [
                'E3', '_', 'E3', 'G3', '_', 'A3', '_', 'E3',
                'D3', '_', 'D3', 'F3', '_', 'G3', '_', 'D3'
            ],
            drums: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
            snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
            melodyWave: 'sawtooth',
            bassWave: 'triangle',
            melodyGain: 0.12,
            bassGain: 0.18,
        }
    };

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.35;
        musicGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.6;
        sfxGain.connect(masterGain);
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (masterGain) {
            masterGain.gain.setValueAtTime(volume, ctx.currentTime);
        }
    }

    // =============================
    // Music scheduling
    // =============================
    function playNote(freq, duration, waveType, vol, time) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = waveType || 'square';
        osc.frequency.setValueAtTime(freq, time);

        noteGain.gain.setValueAtTime(vol, time);
        noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.95);

        osc.connect(noteGain);
        noteGain.connect(musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    function playDrumKick(time) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    function playDrumSnare(time) {
        if (!ctx) return;
        // Noise burst for snare
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        // Bandpass filter for crispness
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        source.start(time);
    }

    function playHiHat(time) {
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * 0.03;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        source.start(time);
    }

    function startMusic(trackName) {
        if (!ctx) init();
        stopMusic();

        currentTrack = trackName || currentTrack;
        const track = TRACKS[currentTrack];
        if (!track) return;

        isPlaying = true;
        const beatDuration = 60 / track.bpm;
        let beatIndex = 0;

        function scheduleBeat() {
            if (!isPlaying) return;

            const now = ctx.currentTime;
            const mi = beatIndex % track.melody.length;
            const bi = beatIndex % track.bass.length;
            const di = beatIndex % track.drums.length;
            const si = beatIndex % track.snare.length;

            const melodyNote = track.melody[mi];
            const bassNote = track.bass[bi];

            // Play melody note
            if (melodyNote !== '_' && N[melodyNote]) {
                playNote(N[melodyNote], beatDuration * 0.7, track.melodyWave, track.melodyGain, now);
            }

            // Play bass note
            if (bassNote !== '_' && N[bassNote]) {
                playNote(N[bassNote], beatDuration * 1.5, track.bassWave, track.bassGain, now);
            }

            // Drums
            if (track.drums[di]) {
                playDrumKick(now);
            }
            if (track.snare[si]) {
                playDrumSnare(now);
            }

            // Hi-hat on every other beat
            if (beatIndex % 2 === 0) {
                playHiHat(now);
            }

            // Beat callback → fire into the game engine for light pulses
            // Every 4 beats = strong pulse, every 2 beats = subtle pulse
            if (beatIndex % 4 === 0) {
                if (typeof GameEngine !== 'undefined' && GameEngine.onBeat) {
                    GameEngine.onBeat();
                }
            }

            beatIndex++;
        }

        scheduleBeat();
        musicInterval = setInterval(scheduleBeat, beatDuration * 1000);

        // Update music toggle button
        const btn = document.getElementById('btn-music-toggle');
        if (btn) btn.classList.add('playing');
    }

    function stopMusic() {
        isPlaying = false;
        if (musicInterval) {
            clearInterval(musicInterval);
            musicInterval = null;
        }
        const btn = document.getElementById('btn-music-toggle');
        if (btn) btn.classList.remove('playing');
    }

    function toggleMusic() {
        if (!ctx) init();
        if (isPlaying) {
            stopMusic();
        } else {
            startMusic(currentTrack);
        }
        return isPlaying;
    }

    function switchTrack(trackName) {
        if (!TRACKS[trackName]) return;
        const wasPlaying = isPlaying;
        stopMusic();
        currentTrack = trackName;
        if (wasPlaying) {
            // Small delay to make the switch audible
            setTimeout(() => startMusic(trackName), 100);
        }
    }

    // =============================
    // Sound Effects
    // =============================
    function playSFX(type) {
        if (!ctx) init();

        switch (type) {
            case 'jump':
                _sfxSlide(200, 600, 0.15, 'square');
                break;
            case 'land':
                _sfxSlide(300, 100, 0.08, 'triangle');
                break;
            case 'hit':
                _sfxNoise(0.15);
                _sfxSlide(400, 100, 0.12, 'sawtooth');
                break;
            case 'collect':
                _sfxSlide(400, 800, 0.12, 'square');
                setTimeout(() => _sfxSlide(600, 1200, 0.1, 'square'), 80);
                break;
            case 'win':
                [0, 100, 200, 300, 400].forEach((delay, i) => {
                    setTimeout(() => {
                        _sfxSlide(400 + i * 100, 600 + i * 150, 0.1, 'square');
                    }, delay);
                });
                break;
            case 'lose':
                _sfxSlide(500, 100, 0.2, 'sawtooth');
                setTimeout(() => _sfxSlide(400, 80, 0.15, 'sawtooth'), 200);
                setTimeout(() => _sfxSlide(300, 60, 0.1, 'sawtooth'), 400);
                break;
            case 'interact':
                _sfxSlide(300, 500, 0.1, 'sine');
                _sfxSlide(500, 700, 0.08, 'sine');
                break;
            case 'bump':
                _sfxNoise(0.1);
                _sfxSlide(200, 80, 0.15, 'triangle');
                break;
            case 'whit_cry':
                _sfxSlide(600, 300, 0.12, 'sine');
                setTimeout(() => _sfxSlide(550, 280, 0.1, 'sine'), 200);
                setTimeout(() => _sfxSlide(500, 250, 0.08, 'sine'), 400);
                break;
            case 'whit_happy':
                _sfxSlide(400, 800, 0.1, 'sine');
                setTimeout(() => _sfxSlide(500, 900, 0.1, 'sine'), 150);
                setTimeout(() => _sfxSlide(600, 1000, 0.08, 'sine'), 300);
                break;
            case 'timer_tick':
                _sfxSlide(800, 600, 0.05, 'sine');
                break;
            case 'timer_warning':
                _sfxSlide(800, 400, 0.1, 'square');
                break;
            case 'button':
                _sfxSlide(500, 700, 0.06, 'sine');
                break;
            default:
                _sfxSlide(300, 500, 0.08, 'square');
        }
    }

    function _sfxSlide(startFreq, endFreq, duration, wave) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    function _sfxNoise(duration) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        source.connect(gain);
        gain.connect(sfxGain);
        source.start(now);
    }

    return {
        init,
        setVolume,
        startMusic,
        stopMusic,
        toggleMusic,
        switchTrack,
        playSFX,
        get isPlaying() { return isPlaying; },
        get currentTrack() { return currentTrack; },
        get tracks() { return TRACKS; }
    };
})();
