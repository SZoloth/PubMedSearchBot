import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime to use local WASM files
ort.env.wasm.wasmPaths = '/';

export class VADProcessor {
    private session: ort.InferenceSession | null = null;
    private state: ort.Tensor | null = null;
    private sr: ort.Tensor | null = null;

    async init(): Promise<void> {
        // Load Silero VAD model from public directory
        const modelUrl = '/silero_vad.onnx';
        this.session = await ort.InferenceSession.create(modelUrl);


        // Initialize State Tensors (2, 1, 64) -> Float32
        const stateData = new Float32Array(2 * 1 * 64).fill(0);
        this.state = new ort.Tensor('float32', stateData, [2, 1, 64]);

        // Initialize Sample Rate Tensor (1) -> int64
        // Silero expects 16k or 8k. We resample to 16k usually. 
        // For this PRD 24k -> 16k VAD. 
        this.sr = new ort.Tensor('int64', new BigInt64Array([16000n]), [1]);
    }

    async process(frame: Float32Array): Promise<boolean> {
        if (!this.session || !this.state || !this.sr) throw new Error("VAD not initialized");

        // Input Frame needs to be [1, N]
        const inputTensor = new ort.Tensor('float32', frame, [1, frame.length]);

        const feeds: Record<string, ort.Tensor> = {
            input: inputTensor,
            state: this.state,
            sr: this.sr
        };

        const results = await this.session.run(feeds);

        // Update State
        this.state = results.stateN;

        // Output is [1, 1] probability
        const probability = results.output.data[0] as number;

        return probability > 0.5;
    }
}

