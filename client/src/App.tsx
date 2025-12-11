import { useEffect, useState } from 'react';
import { CitationList } from './components/CitationList';
import { Waveform } from './components/Waveform';
import { Transcript } from './components/Transcript';
import { SearchHistory } from './components/SearchHistory';
import { useVoiceBot } from './hooks/useVoiceBot';
import { useResearcherStorage } from './hooks/useResearcherStorage';

function App() {
  const { status, startSession, searchResults, transcript, manualSearch } = useVoiceBot();
  const {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    searchHistory,
    addToHistory,
    clearHistory,
  } = useResearcherStorage();

  const [showSidebar, setShowSidebar] = useState(false);
  const [viewMode, setViewMode] = useState<'results' | 'bookmarks'>('results');
  const [currentQuery, setCurrentQuery] = useState<string>('');

  // Track searches and add to history
  useEffect(() => {
    if (searchResults.length > 0) {
      // Extract search query from most recent user message
      const lastUserMsg = [...transcript].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        addToHistory(lastUserMsg.text, searchResults.length);
        setCurrentQuery(lastUserMsg.text);
      }
    }
  }, [searchResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // ACCESSIBILITY: Auto-start on load for blind users
  useEffect(() => {
    if (status === 'idle') {
      startSession().catch((e) => {
        console.log("Auto-start blocked by browser policy, user interaction needed:", e);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayPapers = viewMode === 'bookmarks' ? bookmarks : searchResults;

  return (
    <div
      className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-blue-500/30"
      onClick={() => {
        if (status === 'idle') startSession();
      }}
    >
      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-neutral-950 to-neutral-950 pointer-events-none" />

      {/* Main Layout */}
      <div className="relative z-10 min-h-screen flex">

        {/* Sidebar - hidden on mobile unless toggled */}
        <aside className={`
          fixed md:sticky top-0 left-0 h-screen w-72 bg-neutral-900/80 backdrop-blur-xl border-r border-white/5 p-4 z-40 transform transition-transform
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden p-1 text-neutral-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search History */}
            <div className="mb-4">
              <SearchHistory
                history={searchHistory}
                onClear={clearHistory}
                onSelect={(query) => {
                  setCurrentQuery(query);
                  setViewMode('results');
                  manualSearch(query); // Directly query PubMed API
                }}
              />
            </div>

            {/* Bookmarks Quick Access */}
            {bookmarks.length > 0 && (
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Bookmarks ({bookmarks.length})
                </h3>
                <button
                  onClick={() => setViewMode(viewMode === 'bookmarks' ? 'results' : 'bookmarks')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {viewMode === 'bookmarks' ? 'Show Search Results' : 'View Bookmarks'}
                </button>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <p className="text-xs text-neutral-600 text-center">
              Researcher Pro v1.0
            </p>
          </div>
        </aside>

        {/* Sidebar toggle (mobile) */}
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-4 left-4 z-30 md:hidden p-2 bg-neutral-800 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Main Content */}
        <div className="flex-1 flex flex-col px-4 py-8 md:px-8 lg:px-12 md:ml-0">

          {/* Header */}
          <header className="text-center md:text-left mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
              Researcher Pro
            </h1>
            <p className="text-neutral-400 text-sm md:text-base lg:text-lg font-light mt-2">
              {status === 'idle' ? 'Tap anywhere or press Space to start' : 'Voice-First PubMed Intelligence'}
            </p>
          </header>

          {/* Waveform */}
          <div className="flex flex-col items-center md:items-start mb-6">
            <Waveform status={status} />
          </div>

          {/* Transcript */}
          <div className="mb-6">
            <Transcript messages={transcript} />
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

          {/* Results Section Title */}
          {viewMode === 'results' && currentQuery && (
            <h2 className="text-xl font-semibold text-white mb-4">
              Results for "{currentQuery}"
            </h2>
          )}
          {viewMode === 'bookmarks' && (
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">
              📑 Saved Bookmarks
            </h2>
          )}

          {/* View Mode Toggle */}
          {bookmarks.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('results')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'results' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
              >
                Results ({searchResults.length})
              </button>
              <button
                onClick={() => setViewMode('bookmarks')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'bookmarks' ? 'bg-yellow-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
              >
                Bookmarks ({bookmarks.length})
              </button>
            </div>
          )}

          {/* Citation Cards */}
          <main className="flex-1">
            <CitationList
              papers={displayPapers}
              isLoading={status === 'thinking'}
              isBookmarked={isBookmarked}
              onBookmark={addBookmark}
              onRemoveBookmark={removeBookmark}
            />
          </main>

          {/* Footer hint - mobile only */}
          <footer className="mt-8 text-center text-xs text-neutral-600 md:hidden">
            Say "Hey Bot" to interrupt • Space to toggle
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
