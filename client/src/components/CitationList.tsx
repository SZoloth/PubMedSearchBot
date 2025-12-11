import type { Paper } from '../hooks/useVoiceBot';
import { CitationCard } from './CitationCard';

interface CitationListProps {
    papers: Paper[];
    activePaperId?: string;
    isLoading?: boolean;
    isBookmarked?: (paperId: string) => boolean;
    onBookmark?: (paper: Paper) => void;
    onRemoveBookmark?: (paperId: string) => void;
    onRequestFullText?: (pmid: string) => void;
}

export const CitationList = ({
    papers,
    activePaperId,
    isLoading = false,
    isBookmarked,
    onBookmark,
    onRemoveBookmark,
    onRequestFullText
}: CitationListProps) => {

    // Empty state
    if (!isLoading && papers.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-neutral-500 text-sm">
                    Ask me to search for papers on any topic
                </p>
            </div>
        );
    }

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl p-5 bg-white/5 border border-white/10 animate-pulse"
                    >
                        <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                        <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
                        <div className="h-20 bg-white/10 rounded mb-3" />
                        <div className="flex gap-2">
                            <div className="h-6 bg-white/10 rounded-full w-16" />
                            <div className="h-6 bg-white/10 rounded-full w-20" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Results count */}
            <p className="text-sm text-neutral-500 mb-4">
                {papers.length} result{papers.length !== 1 ? 's' : ''} found
            </p>

            {/* Cards grid - responsive */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {papers.map((paper) => (
                    <CitationCard
                        key={paper.id}
                        paper={paper}
                        isActive={paper.id === activePaperId}
                        isBookmarked={isBookmarked?.(paper.id) ?? false}
                        onBookmark={onBookmark}
                        onRemoveBookmark={onRemoveBookmark}
                        onRequestFullText={onRequestFullText}
                    />
                ))}
            </div>
        </div>
    );
};
