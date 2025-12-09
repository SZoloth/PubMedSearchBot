import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SoundManager', () => {
    let mockContext: any;
    let mockOscillator: any;
    let mockGain: any;

    beforeEach(() => {
        vi.resetModules();

        // Mock Web Audio API
        mockOscillator = {
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            type: '',
            frequency: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            }
        };

        mockGain = {
            connect: vi.fn(),
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            }
        };

        mockContext = {
            currentTime: 0,
            createOscillator: vi.fn(() => mockOscillator),
            createGain: vi.fn(() => mockGain),
            destination: {}
        };

        // Assign to window
        const AudioContextMock = vi.fn(function () { return mockContext; });
        global.window.AudioContext = AudioContextMock as any;
        (global.window as any).webkitAudioContext = AudioContextMock;
    });

    it('should create an AudioContext if one does not exist', async () => {
        const { playEarcon } = await import('./SoundManager');
        playEarcon('listening_start');
        expect(global.window.AudioContext).toHaveBeenCalled();
    });

    it('should create oscillator and gain nodes for "listening_start"', async () => {
        const { playEarcon } = await import('./SoundManager');
        playEarcon('listening_start');
        expect(mockContext.createOscillator).toHaveBeenCalled();
        expect(mockContext.createGain).toHaveBeenCalled();

        // Verify connections
        expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
        expect(mockGain.connect).toHaveBeenCalledWith(mockContext.destination);

        // Verify start/stop
        expect(mockOscillator.start).toHaveBeenCalled();
        expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it('should handle "thinking" sound differently (e.g. different pattern)', async () => {
        const { playEarcon } = await import('./SoundManager');
        playEarcon('thinking');
        expect(mockContext.createOscillator).toHaveBeenCalled();
        // Just ensuring it runs without error for now, specifics depend on implementation
    });
});
