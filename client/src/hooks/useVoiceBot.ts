import { useState, useRef, useCallback, useEffect } from 'react';

import { initializeAudioContext } from '../audio/AudioCore';
import { connectToRealtimeAPI } from '../audio/WebRTC';

export type BotStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export const useVoiceBot = () => {
    const [status, setStatus] = useState<BotStatus>('idle');
    const audioCtxRef = useRef<AudioContext | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const isInitializingRef = useRef(false);

    const stopSession = useCallback(() => {
        dataChannelRef.current?.close();
        audioCtxRef.current?.close();
        peerConnectionRef.current?.close();
        audioCtxRef.current = null;
        peerConnectionRef.current = null;
        dataChannelRef.current = null;
        isInitializingRef.current = false;
        setStatus('idle');
    }, []);

    const startSession = useCallback(async () => {
        // Prevent double-initialization
        if (isInitializingRef.current || status === 'listening' || status === 'thinking' || status === 'speaking') return;

        isInitializingRef.current = true;

        try {
            // 1. Init Audio Context & Source (triggers permission prompt)
            console.log("Step 1: Initializing Audio Context...");
            const { ctx, stream } = await initializeAudioContext();
            audioCtxRef.current = ctx;

            setStatus('thinking'); // Permission granted, now we transition.
            console.log("Step 2: Audio Context ready, connecting to OpenAI...");

            // 2. Connect to OpenAI (returns pc, dc, and remoteAudio)
            const { pc, dc, remoteAudio } = await connectToRealtimeAPI(stream);
            peerConnectionRef.current = pc;
            dataChannelRef.current = dc;
            remoteAudioRef.current = remoteAudio;
            console.log("Step 3: WebRTC connection established!");

            // Audio output is now handled inside connectToRealtimeAPI


            dc.onopen = () => {
                console.log("Step 6: Data Channel Open - Sending Greeting");
                const greetingEvent = {
                    type: 'response.create',
                    response: {
                        modalities: ["text", "audio"],
                        instructions: "Greet the user warmly as 'Researcher Pro'. Keep it brief (1 sentence)."
                    }
                };
                dc.send(JSON.stringify(greetingEvent));
                setStatus('listening');
            };

            dc.onmessage = async (e: MessageEvent) => {
                try {
                    const event = JSON.parse(e.data);
                    console.log("Received event:", event.type);

                    // State Management based on server events
                    if (event.type === 'response.audio.delta') {
                        setStatus('speaking');
                    }

                    // BARGE-IN: When user starts speaking, cancel current response
                    if (event.type === 'input_audio_buffer.speech_started') {
                        console.log("🎤 User speaking - Barge-in triggered, canceling response");
                        setStatus('listening');
                        dc.send(JSON.stringify({ type: 'response.cancel' }));
                    }

                    if (event.type === 'response.done') {
                        setStatus('listening');
                    }

                    // Tool Logic
                    if (event.type === 'response.function_call_arguments.done') {
                        if (event.name === 'search_pubmed') {
                            setStatus('thinking');
                            console.log("Calling Tool:", event.arguments);
                            const args = JSON.parse(event.arguments);

                            const result = await fetch('/api/tools/pubmed', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(args)
                            });

                            const data = await result.json();
                            console.log("Tool Result:", data);

                            const toolOutput = {
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: event.call_id,
                                    output: JSON.stringify(data)
                                }
                            };
                            dc.send(JSON.stringify(toolOutput));
                            dc.send(JSON.stringify({ type: 'response.create' }));
                        }
                    }
                } catch (err) {
                    console.error("Error processing message:", err);
                }
            };

            dc.onerror = (err) => {
                console.error("Data Channel Error:", err);
            };

        } catch (e) {
            console.error("Failed to start session:", e);
            stopSession();
        } finally {
            isInitializingRef.current = false;
        }
    }, [status, stopSession]);


    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    return { status, startSession };
};
