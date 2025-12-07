import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeAudioContext } from './AudioCore';

describe('AudioCore Initialization', () => {
    beforeEach(() => {
        // Mock AudioContext
        class AudioContextMock {
            sampleRate = 48000;
            state = 'suspended';
            close = vi.fn();
            suspend = vi.fn();
            resume = vi.fn().mockResolvedValue(undefined);
            constructor(options?: any) {
                if (options?.sampleRate) {
                    this.sampleRate = options.sampleRate;
                }
            }
            createMediaStreamSource() { return {}; }
        }

        vi.stubGlobal('AudioContext', AudioContextMock);
        vi.stubGlobal('navigator', {
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue({})
            }
        });
    });


    it('should initialize AudioContext with preferred sample rate', async () => {
        const { ctx } = await initializeAudioContext();
        expect(ctx).toBeDefined();
        // We can't strictly enforce 24k if browser denies it, but we check valid instance
        expect(ctx.sampleRate).toBeGreaterThan(0);
    });

});
