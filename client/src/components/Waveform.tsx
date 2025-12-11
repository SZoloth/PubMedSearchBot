import { useEffect, useRef } from 'react';
import type { BotStatus } from '../hooks/useVoiceBot';

interface WaveformProps {
    status: BotStatus;
    audioContext?: AudioContext | null;
}

export const Waveform = ({ status }: WaveformProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const barCount = 32;
        const barWidth = 3;
        const gap = 4;
        const maxHeight = height * 0.8;

        let phase = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Different animations based on status
            const isActive = status === 'listening' || status === 'speaking';
            const isSpeaking = status === 'speaking';

            for (let i = 0; i < barCount; i++) {
                const x = (width - (barCount * (barWidth + gap))) / 2 + i * (barWidth + gap);

                let barHeight: number;

                if (status === 'idle') {
                    // Flat line when idle
                    barHeight = 2;
                } else if (status === 'thinking') {
                    // Pulsing dots when thinking
                    const pulse = Math.sin(phase * 2 + i * 0.3) * 0.5 + 0.5;
                    barHeight = 4 + pulse * 8;
                } else {
                    // Wave animation when listening/speaking
                    const frequency = isSpeaking ? 1.5 : 1;
                    const amplitude = isSpeaking ? 0.8 : 0.5;
                    const wave = Math.sin(phase * frequency + i * 0.4) * amplitude;
                    const noise = (Math.random() - 0.5) * (isActive ? 0.3 : 0);
                    barHeight = (0.3 + (wave + 0.5) * 0.7 + noise) * maxHeight;
                }

                const y = centerY - barHeight / 2;

                // Color gradient based on status
                let color: string;
                if (status === 'speaking') {
                    color = `rgba(34, 211, 238, ${0.6 + Math.sin(phase + i * 0.2) * 0.3})`; // Cyan
                } else if (status === 'listening') {
                    color = `rgba(74, 222, 128, ${0.6 + Math.sin(phase + i * 0.2) * 0.3})`; // Green
                } else if (status === 'thinking') {
                    color = `rgba(250, 204, 21, ${0.5 + Math.sin(phase * 2) * 0.3})`; // Yellow
                } else {
                    color = 'rgba(115, 115, 115, 0.5)'; // Gray
                }

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
                ctx.fill();
            }

            phase += 0.05;
            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [status]);

    return (
        <div className="flex flex-col items-center">
            <canvas
                ref={canvasRef}
                width={280}
                height={60}
                className="opacity-80"
            />
            <span className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                {status}
            </span>
        </div>
    );
};
