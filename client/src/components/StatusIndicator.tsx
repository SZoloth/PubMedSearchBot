import { motion } from 'framer-motion';
import type { BotStatus } from '../hooks/useVoiceBot';


const statusConfig = {
    idle: { color: 'bg-gray-500', text: 'Initialize', glow: 'shadow-gray-500/50' },
    listening: { color: 'bg-green-500', text: 'Listening', glow: 'shadow-green-500/50' },
    thinking: { color: 'bg-blue-500', text: 'Thinking', glow: 'shadow-blue-500/50' },
    speaking: { color: 'bg-red-500', text: 'Speaking', glow: 'shadow-red-500/50' },
};

export const StatusIndicator = ({ status }: { status: BotStatus }) => {
    const config = statusConfig[status];

    return (
        <motion.div
            className="flex flex-col items-center justify-center p-8"
            initial={false}
            animate={{ scale: status === 'speaking' ? [1, 1.1, 1] : 1 }}
            transition={{ repeat: status === 'speaking' ? Infinity : 0, duration: 1.5 }}
        >
            <div
                className={`
                    w-32 h-32 rounded-full
                    ${config.color}
                    shadow-lg ${config.glow}
                    flex items-center justify-center
                    backdrop-blur-md bg-opacity-80
                    border-4 border-white/10
                    transition-all duration-300
                `}
            >
                <div className="w-24 h-24 rounded-full bg-white/20 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-light tracking-widest text-white/90 uppercase">
                {config.text}
            </h2>
        </motion.div>
    );
};

