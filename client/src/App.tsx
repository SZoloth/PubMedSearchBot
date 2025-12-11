import { useEffect } from 'react';
import { StatusIndicator } from './components/StatusIndicator';
import { CitationList } from './components/CitationList';
import { useVoiceBot } from './hooks/useVoiceBot';

function App() {
  const { status, startSession, searchResults } = useVoiceBot();

  // ACCESSIBILITY: Auto-start on load for blind users
  // This ensures the bot greets them without requiring them to find a button
  // The globalSessionActive guard in useVoiceBot prevents double-initialization
  useEffect(() => {
    if (status === 'idle') {
      startSession().catch((e) => {
        console.log("Auto-start blocked by browser policy, user interaction needed:", e);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-blue-500/30"
      onClick={() => {
        if (status === 'idle') startSession();
      }}
    >
      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-neutral-950 to-neutral-950 pointer-events-none" />

      {/* Main Content - responsive padding */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8 md:px-8 lg:px-12">

        {/* Header - centered on mobile, left on desktop */}
        <header className="text-center md:text-left mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            Researcher Pro
          </h1>
          <p className="text-neutral-400 text-sm md:text-base lg:text-lg font-light mt-2">
            {status === 'idle' ? 'Tap anywhere or press Space to start' : 'Voice-First PubMed Intelligence'}
          </p>
        </header>

        {/* Status Indicator - smaller on mobile */}
        <div className="flex justify-center md:justify-start mb-8">
          <div className="transform scale-75 md:scale-100 origin-center md:origin-left">
            <StatusIndicator status={status} />
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Citation Cards */}
        <main className="flex-1">
          <CitationList
            papers={searchResults}
            isLoading={status === 'thinking'}
          />
        </main>

        {/* Footer hint - mobile only */}
        <footer className="mt-8 text-center text-xs text-neutral-600 md:hidden">
          Say "Hey Bot" to interrupt • Space to toggle
        </footer>
      </div>
    </div>
  );
}

export default App;
