import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectToRealtimeAPI } from './WebRTC';

// Mock global fetch
global.fetch = vi.fn();

describe('WebRTC Connection Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock RTCPeerConnection
        class RTCPeerConnectionMock {
            createDataChannel = vi.fn(() => ({
                addEventListener: vi.fn(),
            }));
            addTrack = vi.fn();
            setRemoteDescription = vi.fn();
            createAnswer = vi.fn().mockResolvedValue({ sdp: 'mock-sdp', type: 'answer' });
            setLocalDescription = vi.fn();
            addEventListener = vi.fn();
        }
        vi.stubGlobal('RTCPeerConnection', RTCPeerConnectionMock);
    });

    it('should fetch ephemeral key and initialize PeerConnection', async () => {
        // Mock session endpoint response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ client_secret: { value: 'ek_test_key' } }),
        });

        const pc = await connectToRealtimeAPI();

        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/session');
        expect(pc).toBeDefined();
        // Check if createDataChannel was called (proof of setup)
        expect(pc.createDataChannel).toHaveBeenCalledWith('oai-events');
    });
});
