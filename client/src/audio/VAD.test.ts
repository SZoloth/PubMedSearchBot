import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VADProcessor } from './VAD';

// Hoist the mock factory
vi.mock('onnxruntime-web', () => {
    const mockRun = vi.fn().mockResolvedValue({
        output: { data: [0.9] },
        stateN: {} // Mock state return
    });

    return {
        InferenceSession: {
            create: vi.fn().mockResolvedValue({
                run: mockRun
            })
        },
        Tensor: vi.fn()
    };
});


describe('VAD Processor', () => {
    let vad: VADProcessor;

    beforeEach(() => {
        vad = new VADProcessor();
        vi.clearAllMocks();
    });

    it('should initialize the ONNX session', async () => {
        await vad.init();
        const ort = await import('onnxruntime-web');
        expect(ort.InferenceSession.create).toHaveBeenCalled();
    });

    it('should return speech probability', async () => {
        await vad.init();
        // Since we cannot easily spy on the inner mockRun without extracting it,
        // we verify the BEHAVIOR (output) which depends on mockRun being called.
        const float32Array = new Float32Array(512).fill(0);
        const isSpeech = await vad.process(float32Array);

        // Assert result based on the mocked 0.9 return value
        expect(isSpeech).toBe(true);
    });

});
