import { useState } from 'react';
import type { Paper } from '../hooks/useVoiceBot';

interface CitationCardProps {
    paper: Paper;
    isActive?: boolean;
    onRequestFullText?: (pmid: string) => void;
}

export const CitationCard = ({ paper, isActive = false, onRequestFullText }: CitationCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <article
            className={`
                relative rounded-2xl p-5 backdrop-blur-xl transition-all duration-300
                ${isActive
                    ? 'bg-blue-500/20 border-2 border-blue-400/50 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                }
            `}
        >
            {/* Active indicator */}
            {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-white leading-tight mb-2 line-clamp-2">
                {paper.title}
            </h3>

            {/* Citation line */}
            <p className="text-sm text-neutral-400 mb-3">
                {paper.authors.split(',').slice(0, 2).join(', ')}
                {paper.authors.split(',').length > 2 && ' et al.'}
                {' · '}
                <span className="text-neutral-500">{paper.journal}</span>
                {' · '}
                <span className="text-neutral-500">{paper.pubdate?.split(' ')[0]}</span>
            </p>

            {/* Abstract (expandable) */}
            <div className="mb-3">
                <p className={`text-sm text-neutral-300 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {paper.abstract}
                </p>
                {paper.abstract && paper.abstract.length > 200 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                    >
                        {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>

            {/* MeSH Terms */}
            {paper.mesh_terms && paper.mesh_terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {paper.mesh_terms.slice(0, 5).map((term, i) => (
                        <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700"
                        >
                            {term}
                        </span>
                    ))}
                    {paper.mesh_terms.length > 5 && (
                        <span className="text-xs text-neutral-500">
                            +{paper.mesh_terms.length - 5} more
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
                <a
                    href={paper.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-sm py-2 rounded-lg bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                    Open in PubMed
                </a>
                {onRequestFullText && (
                    <button
                        onClick={() => onRequestFullText(paper.id)}
                        className="flex-1 text-center text-sm py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-colors"
                    >
                        Read Full Text
                    </button>
                )}
            </div>
        </article>
    );
};
