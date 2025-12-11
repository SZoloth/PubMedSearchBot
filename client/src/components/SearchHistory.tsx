import type { SearchHistoryEntry } from '../hooks/useResearcherStorage';

interface SearchHistoryProps {
    history: SearchHistoryEntry[];
    onClear: () => void;
    onSelect?: (query: string) => void;
}

export const SearchHistory = ({ history, onClear, onSelect }: SearchHistoryProps) => {
    if (history.length === 0) {
        return null;
    }

    return (
        <div className="bg-neutral-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Searches
                </h3>
                <button
                    onClick={onClear}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    Clear
                </button>
            </div>

            <ul className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((entry) => (
                    <li
                        key={entry.id}
                        onClick={() => onSelect?.(entry.query)}
                        className="text-sm text-neutral-300 py-1.5 px-2 rounded-lg hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent cursor-pointer transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="truncate">{entry.query}</span>
                            <span className="text-xs text-neutral-500 ml-2 shrink-0">
                                {entry.resultCount} results
                            </span>
                        </div>
                        <span className="text-xs text-neutral-600">
                            {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
