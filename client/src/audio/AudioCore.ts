export const initializeAudioContext = async (): Promise<{ ctx: AudioContext, source: MediaStreamAudioSourceNode, stream: MediaStream }> => {

    const ctx = new window.AudioContext({ sampleRate: 24000 });
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    });
    const source = ctx.createMediaStreamSource(stream);

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
    return { ctx, source, stream };
};
