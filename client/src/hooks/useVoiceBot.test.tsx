import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVoiceBot } from './useVoiceBot';

// Mock Dependencies
vi.mock('../audio/AudioCore');
vi.mock('../audio/WebRTC');
vi.mock('../audio/VAD');

describe('useVoiceBot Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start in IDLE state', () => {
        const { result } = renderHook(() => useVoiceBot());
        expect(result.current.status).toBe('idle');
    });


    it('should execute tool when receiving function call event', async () => {
        // Setup mocks
        const mockDataChannel = {
            label: 'oai-events',
            onopen: null as any,
            onmessage: null as any,
            onerror: null as any,
            readyState: 'open',
            send: vi.fn(),
            close: vi.fn(),
        };

        const mockPC = {
            close: vi.fn(),
            ontrack: null,
        };

        // Mock the WebRTC module - now returns { pc, dc }
        const { connectToRealtimeAPI } = await import('../audio/WebRTC');
        vi.mocked(connectToRealtimeAPI).mockResolvedValue({ pc: mockPC as any, dc: mockDataChannel as any });


        const { initializeAudioContext } = await import('../audio/AudioCore');
        vi.mocked(initializeAudioContext).mockResolvedValue({
            ctx: {
                createScriptProcessor: vi.fn(() => ({ connect: vi.fn(), onaudioprocess: null })),
                destination: {},
                close: vi.fn()
            } as any,
            source: { connect: vi.fn() } as any,
            stream: { getTracks: () => [{}] } as any
        });

        // Spy on fetch for tool call
        (globalThis as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: ['paper1'] })
        });

        const { result } = renderHook(() => useVoiceBot());

        // Start Session
        await act(async () => {
            await result.current.startSession();
        });

        // Trigger onopen directly on the data channel
        await act(async () => {
            mockDataChannel.onopen?.();
        });

        expect(mockDataChannel.send).toHaveBeenCalledWith(expect.stringContaining('response.create'));


        // Simulate receiving function call event
        const toolCallEvent = {
            type: 'response.function_call_arguments.done',
            call_id: 'call_123',
            name: 'search_pubmed',
            arguments: JSON.stringify({ query: 'sarcopenia' })
        };

        // Trigger onmessage
        await act(async () => {
            await mockDataChannel.onmessage?.({ data: JSON.stringify(toolCallEvent) });
        });

        expect((globalThis as any).fetch).toHaveBeenCalledWith('/api/tools/pubmed', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ query: 'sarcopenia' })
        }));

        // Assert Tool Result Sent back
        expect(mockDataChannel.send).toHaveBeenCalledWith(expect.stringContaining('function_call_output'));
    });



    it('should initialize AudioContext and WebRTC on start', async () => {
        // Setup mocks
        const mockContext = {
            close: vi.fn()
        };

        const mockDataChannel = {
            label: 'oai-events',
            onopen: null as any,
            onmessage: null as any,
            onerror: null as any,
            send: vi.fn(),
            close: vi.fn(),
        };

        const mockPC = {
            close: vi.fn(),
            ontrack: null,
        };

        const { result } = renderHook(() => useVoiceBot());

        const { initializeAudioContext } = await import('../audio/AudioCore');
        vi.mocked(initializeAudioContext).mockResolvedValue({
            ctx: mockContext as any,
            source: { connect: vi.fn() } as any,
            stream: { getTracks: () => [{}] } as any
        });

        const { connectToRealtimeAPI } = await import('../audio/WebRTC');
        vi.mocked(connectToRealtimeAPI).mockResolvedValue({ pc: mockPC as any, dc: mockDataChannel as any });

        await act(async () => {
            await result.current.startSession();
        });

        expect(initializeAudioContext).toHaveBeenCalled();
        expect(connectToRealtimeAPI).toHaveBeenCalled();

        // Trigger onopen to get status to 'listening'
        await act(async () => {
            mockDataChannel.onopen?.();
        });

        expect(result.current.status).toBe('listening');
    });


    // Complex test: assert tool execution state
    // We will expand this as we implement the tool logic
});
