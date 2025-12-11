interface SpeedControlProps {
    rate: number;
    onChange: (rate: number) => void;
}

export const SpeedControl = ({ rate, onChange }: SpeedControlProps) => {
    return (
        <div className="bg-neutral-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Reading Speed
                </h3>
                <span className="text-sm font-mono text-neutral-300">{rate}×</span>
            </div>

            <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={rate}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="flex justify-between mt-1 text-xs text-neutral-600">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
            </div>
        </div>
    );
};
