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
    const remoteAudio = new Audio();
    remoteAudio.autoplay = true;

    pc.ontrack = (e) => {
        console.log("🔊 Received remote audio track from OpenAI!");
        remoteAudio.srcObject = e.streams[0];
        // Also try to play explicitly in case autoplay is blocked
        remoteAudio.play().catch(err => {
            console.warn("Autoplay blocked, user interaction needed:", err);
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

