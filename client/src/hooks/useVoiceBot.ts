import { useState, useRef, useCallback, useEffect } from 'react';

import { initializeAudioContext } from '../audio/AudioCore';
import { connectToRealtimeAPI } from '../audio/WebRTC';
import { playEarcon } from '../audio/SoundManager';

export type BotStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

// Paper type for search results
export interface Paper {
    id: string;
    title: string;
    authors: string;
    journal: string;
    pubdate: string;
    link: string;
    abstract: string;
    mesh_terms: string[];
    citation: string;
}

// Transcript message type
export interface TranscriptMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
}

// Module-level singleton to survive React StrictMode remounts
let globalSessionActive = false;

export const useVoiceBot = () => {
    const [status, setStatus] = useState<BotStatus>('idle');
    const [searchResults, setSearchResults] = useState<Paper[]>([]);
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    // Wake word detection refs
    const isBotSpeakingRef = useRef(false);
    const pendingBargeInRef = useRef(false);

    // Sound Effects for Status Changes
    useEffect(() => {
        if (status === 'listening') playEarcon('listening_start');
        // We could add 'listening_stop' logic here if we had a distinct 'processing' state before 'thinking'
        if (status === 'thinking') playEarcon('thinking');
        // if (status === 'speaking') // Maybe no sound needed, speech starts
    }, [status]);

    const startSession = useCallback(async () => {
        // Guard against multiple simultaneous calls (module-level singleton survives StrictMode)
        if (globalSessionActive) {
            console.log("⚠️ Session init already in progress, ignoring duplicate call");
            return;
        }
        if (status !== 'idle') {
            console.log("⚠️ Session already active (status:", status, "), ignoring");
            return;
        }
        globalSessionActive = true;

        try {
            console.log("Step 1: Application Auto-Start Initiated");

            // 1. Initialize Audio Context
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
                    console.log("📨 Received event:", event.type); // Enable verbose logging

                    // Track when bot starts speaking (WebRTC audio goes via track, not data channel)
                    // Use output_audio_buffer.started which fires when audio output begins
                    if (event.type === 'output_audio_buffer.started') {
                        setStatus('speaking');
                        isBotSpeakingRef.current = true;
                    }

                    // Also catch response.audio.delta as backup
                    if (event.type === 'response.audio.delta') {
                        if (!isBotSpeakingRef.current) {
                            setStatus('speaking');
                        }
                        isBotSpeakingRef.current = true;
                    }

                    // Bot finished speaking
                    if (event.type === 'response.done' || event.type === 'output_audio_buffer.stopped') {
                        setStatus('listening');
                        isBotSpeakingRef.current = false;
                        pendingBargeInRef.current = false;
                    }

                    // WAKE WORD BARGE-IN: Only interrupt if saying "hey bot"
                    if (event.type === 'input_audio_buffer.speech_started') {
                        if (isBotSpeakingRef.current) {
                            // Bot is speaking - flag that we need to check for wake word
                            console.log("🎤 User speaking while bot talking - waiting for wake word...");
                            pendingBargeInRef.current = true;
                        } else {
                            // Bot was listening - normal flow, no wake word needed
                            console.log("🎤 User speaking (bot was listening)");
                        }
                    }

                    // Check transcript for wake word
                    if (event.type === 'conversation.item.input_audio_transcription.completed') {
                        const userText = (event.transcript || '').trim();
                        console.log("📝 Transcript:", userText);

                        // Add user message to transcript
                        if (userText) {
                            setTranscript(prev => [...prev, {
                                id: `user-${Date.now()}`,
                                role: 'user',
                                text: userText,
                                timestamp: Date.now()
                            }]);
                        }

                        if (pendingBargeInRef.current) {
                            // We were waiting to check for wake word
                            const lowerText = userText.toLowerCase();
                            if (lowerText.includes('hey bot') || lowerText.includes('hey bott') || lowerText.includes('a bot')) {
                                console.log("🚨 Wake word detected! Barge-in activated.");
                                setStatus('listening');
                                isBotSpeakingRef.current = false;
                                pendingBargeInRef.current = false;
                                playEarcon('listening_start');
                                dc.send(JSON.stringify({ type: 'response.cancel' }));
                            } else {
                                console.log("⏸️ No wake word - ignoring, bot continues");
                                pendingBargeInRef.current = false;
                            }
                        }
                    }

                    // Capture bot's spoken response transcript
                    if (event.type === 'response.audio_transcript.done') {
                        const botText = (event.transcript || '').trim();
                        if (botText) {
                            setTranscript(prev => [...prev, {
                                id: `bot-${Date.now()}`,
                                role: 'assistant',
                                text: botText,
                                timestamp: Date.now()
                            }]);
                        }
                    }

                    if (event.type === 'response.function_call_arguments.done') {
                        console.log("🛠️ Tool call received:", event.name, event.arguments);
                        setStatus('thinking');

                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                        if (event.name === 'search_pubmed') {
                            const args = JSON.parse(event.arguments);
                            console.log("🔍 Executing PubMed Search:", args.query);

                            const result = await fetch(`${apiUrl}/api/tools/pubmed`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(args)
                            });

                            const data = await result.json();
                            console.log("✅ PubMed Results:", data);

                            // Store results for UI display
                            setSearchResults(data);

                            const toolOutputEvent = {
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: event.call_id,
                                    output: JSON.stringify(data)
                                }
                            };
                            dc.send(JSON.stringify(toolOutputEvent));
                            dc.send(JSON.stringify({ type: 'response.create' }));

                        } else if (event.name === 'get_full_text') {
                            const args = JSON.parse(event.arguments);
                            console.log("📖 Fetching Full Text for PMID:", args.pmid);

                            const result = await fetch(`${apiUrl}/api/tools/fulltext`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(args)
                            });

                            const data = await result.json();
                            console.log("📄 Full Text Result:", data.success ? "Retrieved" : data.error);

                            const toolOutputEvent = {
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: event.call_id,
                                    output: JSON.stringify(data)
                                }
                            };
                            dc.send(JSON.stringify(toolOutputEvent));
                            dc.send(JSON.stringify({ type: 'response.create' }));
                        }
                    }
                } catch (err) {
                    console.error("Error processing message:", err);
                    playEarcon('error');
                }
            };

            dc.onerror = (err) => {
                console.error("Data Channel Error:", err);
            };

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('idle'); // Reset on failure
            playEarcon('error');
            globalSessionActive = false;
        }
    }, [status]); // Dependencies

    const stopSession = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
            remoteAudioRef.current = null;
        }
        setStatus('idle');
        playEarcon('listening_stop');
        globalSessionActive = false;
    }, []);

    // Global Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                if (status === 'idle') {
                    startSession();
                } else {
                    // For now, Space can toggle session stop, or we could make it 'Push to Talk' later
                    // Let's make it act as a "Stop/Reset" toggle if active, or just a "Wake" button
                    // Given the request was "toggle", stopSession if active makes sense.
                    stopSession();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, startSession, stopSession]);


    // Function to set playback rate on the remote audio element
    const setPlaybackRate = useCallback((rate: number) => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.playbackRate = rate;
            console.log(`🔊 Playback rate set to ${rate}x`);
        }
    }, []);

    // Manual search function - directly queries PubMed API without voice
    const manualSearch = useCallback(async (query: string) => {
        console.log("🔍 Manual PubMed Search:", query);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        try {
            const result = await fetch(`${apiUrl}/api/tools/pubmed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, retmax: 10 })
            });

            const data = await result.json();
            console.log("✅ Manual Search Results:", data);
            setSearchResults(data);
            return data;
        } catch (error) {
            console.error("❌ Manual search failed:", error);
            return [];
        }
    }, []);

    // Note: Removed cleanup on unmount - in StrictMode this causes
    // the guard to reset between mounts, allowing double-initialization.
    // The browser will clean up WebRTC connections when the page closes.

    return { status, startSession, searchResults, transcript, setPlaybackRate, manualSearch };
};
