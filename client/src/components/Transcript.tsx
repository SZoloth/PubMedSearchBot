import { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../hooks/useVoiceBot';

interface TranscriptProps {
    messages: TranscriptMessage[];
}

export const Transcript = ({ messages }: TranscriptProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (messages.length === 0) {
        return null; // Don't show empty transcript
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-sm font-medium text-neutral-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Conversation
            </h2>

            <div
                ref={scrollRef}
                className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`
                                max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-600/30 text-blue-100 rounded-br-md'
                                    : 'bg-neutral-800/80 text-neutral-200 rounded-bl-md'
                                }
                            `}
                        >
                            <p className="leading-relaxed">{msg.text}</p>
                            <span className="text-[10px] opacity-50 mt-1 block">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
