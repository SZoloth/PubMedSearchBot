export type EarconType = 'listening_start' | 'listening_stop' | 'thinking' | 'success' | 'error';

let audioCtx: AudioContext | null = null;

const getContext = () => {
    if (!audioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new Ctx();
    }
    return audioCtx;
};

export const playEarcon = (type: EarconType) => {
    try {
        const ctx = getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'listening_start':
                // High-pitch "Ping" (880Hz -> 1760Hz)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;

            case 'listening_stop':
                // Low-pitch "Pong" (440Hz -> 220Hz)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, now);
                oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.15);

                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);

                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'thinking':
                // Subtle pulse (Low frequency LFO feel)
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(200, now);

                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.05, now + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'success':
                // Major ascending arpeggio effect (quick)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5

                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);

                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;

            case 'error':
                // Discordant buzz
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, now);

                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);

                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;
        }

    } catch (e) {
        console.error("Failed to play earcon:", e);
    }
};
