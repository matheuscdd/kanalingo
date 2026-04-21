(() => {
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

app.createAudioSystem = function createAudioSystem() {
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;

    if (!AudioContextCtor) {
        return {
            play() {},
            resume() {},
            dispose() {}
        };
    }

    const audioContext = new AudioContextCtor();
    let disposed = false;

    function resume() {
        if (disposed || audioContext.state !== "suspended") {
            return;
        }

        audioContext.resume().catch(() => {});
    }

    function play(type) {
        if (disposed) {
            return;
        }

        resume();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const now = audioContext.currentTime;

        if (type === "shoot") {
            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.12);
            gainNode.gain.setValueAtTime(0.09, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            oscillator.start(now);
            oscillator.stop(now + 0.12);
            return;
        }

        if (type === "hit") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(760, now);
            oscillator.frequency.exponentialRampToValueAtTime(1220, now + 0.16);
            gainNode.gain.setValueAtTime(0.14, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            return;
        }

        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(160, now);
        oscillator.frequency.linearRampToValueAtTime(78, now + 0.24);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.24);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
    }

    return {
        play,
        resume,
        dispose() {
            if (disposed) {
                return;
            }

            disposed = true;
            audioContext.close().catch(() => {});
        }
    };
};
})();