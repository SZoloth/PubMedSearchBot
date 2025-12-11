/**
 * Connects to OpenAI Realtime API via WebRTC.
 * 
 * This function performs the complete WebRTC connection flow:
 * 1. Fetches an ephemeral key from the backend
 * 2. Creates RTCPeerConnection
 * 3. Sets up audio output handling
 * 4. Adds local audio track
 * 5. Creates data channel
 * 6. Generates SDP offer
 * 7. Sends offer to OpenAI and receives answer
 * 8. Sets remote description to complete connection
 * 
 * @param localStream - The MediaStream from the user's microphone
 * @returns Object containing the connected RTCPeerConnection, RTCDataChannel, and Audio element
 */
export const connectToRealtimeAPI = async (localStream: MediaStream): Promise<{ pc: RTCPeerConnection, dc: RTCDataChannel, remoteAudio: HTMLAudioElement }> => {
    // 1. Get Ephemeral Key from backend
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/session`);
    if (!response.ok) throw new Error('Failed to get session');
    const data = await response.json();
    const ephemeralKey = data.client_secret.value;

    // 2. Create RTCPeerConnection
    const pc = new RTCPeerConnection();

    // 3. Set up audio output handling BEFORE signaling (critical!)
    const remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.id = 'voicebot-remote-audio';

    // CRITICAL: Attach to DOM - some browsers don't reliably play unattached audio
    // Remove any existing one first to avoid duplicates
    const existing = document.getElementById('voicebot-remote-audio');
    if (existing) existing.remove();
    document.body.appendChild(remoteAudio);

    console.log("🔊 Audio element created and attached to DOM");

    pc.ontrack = (e) => {
        console.log("🔊 Received remote audio track from OpenAI!");
        console.log("🔊 Track info:", e.track.kind, e.track.readyState);
        console.log("🔊 Streams:", e.streams.length);

        remoteAudio.srcObject = e.streams[0];

        // Ensure audio settings are correct
        remoteAudio.muted = false;
        remoteAudio.volume = 1.0;

        // Log audio element state
        console.log("🔊 Audio element state - paused:", remoteAudio.paused, "muted:", remoteAudio.muted, "volume:", remoteAudio.volume);

        // Try to play with detailed error handling
        remoteAudio.play()
            .then(() => {
                console.log("✅ Audio playback started successfully!");
                console.log("🔊 Audio element after play - paused:", remoteAudio.paused);
            })
            .catch(err => {
                console.error("❌ Audio playback FAILED:", err.name, err.message);
                console.log("ℹ️ User gesture required. Audio will play on next user interaction.");
            });
    };

    // 4. Add local audio track (microphone input)
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    // 5. Create Data Channel for events BEFORE creating offer
    const dc = pc.createDataChannel("oai-events");

    // 6. Generate SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 7. Send Offer to OpenAI Realtime API
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";

    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp"
        },
        body: offer.sdp
    });

    if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`Failed to connect to OpenAI Realtime: ${sdpResponse.status} - ${errorText}`);
    }

    // 8. Set Remote Description (complete the handshake)
    const answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
    });

    console.log("WebRTC connection established with OpenAI Realtime API");

    return { pc, dc, remoteAudio };
};

