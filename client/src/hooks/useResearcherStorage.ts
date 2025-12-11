import { useState, useEffect, useCallback } from 'react';
import type { Paper } from './useVoiceBot';

// Search history entry
export interface SearchHistoryEntry {
    id: string;
    query: string;
    timestamp: number;
    resultCount: number;
}

const STORAGE_KEYS = {
    BOOKMARKS: 'researcher-pro-bookmarks',
    HISTORY: 'researcher-pro-history',
    SPEECH_RATE: 'researcher-pro-speech-rate',
};

export const useResearcherStorage = () => {
    // Bookmarks
    const [bookmarks, setBookmarks] = useState<Paper[]>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
        return stored ? JSON.parse(stored) : [];
    });

    // Search History
    const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return stored ? JSON.parse(stored) : [];
    });

    // Speech Rate (0.5 to 2.0, default 1.0)
    const [speechRate, setSpeechRate] = useState<number>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SPEECH_RATE);
        return stored ? parseFloat(stored) : 1.0;
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    }, [bookmarks]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(searchHistory));
    }, [searchHistory]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SPEECH_RATE, speechRate.toString());
    }, [speechRate]);

    // Bookmark actions
    const addBookmark = useCallback((paper: Paper) => {
        setBookmarks(prev => {
            if (prev.some(p => p.id === paper.id)) return prev; // Already bookmarked
            return [...prev, paper];
        });
    }, []);

    const removeBookmark = useCallback((paperId: string) => {
        setBookmarks(prev => prev.filter(p => p.id !== paperId));
    }, []);

    const isBookmarked = useCallback((paperId: string) => {
        return bookmarks.some(p => p.id === paperId);
    }, [bookmarks]);

    // History actions
    const addToHistory = useCallback((query: string, resultCount: number) => {
        const entry: SearchHistoryEntry = {
            id: `search-${Date.now()}`,
            query,
            timestamp: Date.now(),
            resultCount,
        };
        setSearchHistory(prev => {
            // Keep last 20 searches
            const updated = [entry, ...prev.slice(0, 19)];
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
    }, []);

    return {
        // Bookmarks
        bookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,
        // History
        searchHistory,
        addToHistory,
        clearHistory,
        // Speech Rate
        speechRate,
        setSpeechRate,
    };
};
