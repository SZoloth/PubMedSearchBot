import { useState } from 'react';
import type { Paper } from '../hooks/useVoiceBot';

type CitationFormat = 'apa' | 'mla' | 'bibtex';

interface CitationExportProps {
    paper: Paper;
    onClose: () => void;
}

const formatCitation = (paper: Paper, format: CitationFormat): string => {
    const authors = paper.authors.split(',').map(a => a.trim());
    const firstAuthor = authors[0] || 'Unknown';
    const year = paper.pubdate?.split(' ')[0] || 'n.d.';

    switch (format) {
        case 'apa':
            // APA 7th: Author, A. A., & Author, B. B. (Year). Title. Journal.
            const apaAuthors = authors.length > 2
                ? `${firstAuthor} et al.`
                : authors.join(' & ');
            return `${apaAuthors} (${year}). ${paper.title}. ${paper.journal}.`;

        case 'mla':
            // MLA 9th: Author. "Title." Journal, Year.
            return `${firstAuthor}. "${paper.title}." ${paper.journal}, ${year}.`;

        case 'bibtex':
            // BibTeX format
            const bibKey = `${firstAuthor.split(' ')[0].toLowerCase()}${year}`;
            return `@article{${bibKey},
  title = {${paper.title}},
  author = {${paper.authors}},
  journal = {${paper.journal}},
  year = {${year}},
  pmid = {${paper.id}}
}`;

        default:
            return paper.citation || paper.title;
    }
};

export const CitationExport = ({ paper, onClose }: CitationExportProps) => {
    const [format, setFormat] = useState<CitationFormat>('apa');
    const [copied, setCopied] = useState(false);

    const citation = formatCitation(paper, format);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(citation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Export Citation</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Format selector */}
                <div className="flex gap-2 mb-4">
                    {(['apa', 'mla', 'bibtex'] as CitationFormat[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFormat(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${format === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Citation preview */}
                <div className="bg-neutral-800 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                    <pre className="text-sm text-neutral-200 whitespace-pre-wrap font-mono">
                        {citation}
                    </pre>
                </div>

                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors ${copied
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
            </div>
        </div>
    );
};
