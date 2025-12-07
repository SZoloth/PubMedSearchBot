import { useEffect } from 'react';
import { StatusIndicator } from './components/StatusIndicator';
import { useVoiceBot } from './hooks/useVoiceBot';

function App() {

  const { status, startSession } = useVoiceBot();

  // Attempt auto-start on mount
  useEffect(() => {
    startSession().catch((e) => {
      // If auto-start fails (browser policy), we wait for user interaction
      console.log("Auto-start blocked or failed:", e);
    });
  }, [startSession]);

  return (
    <div
      className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white font-sans selection:bg-blue-500/30"
      onClick={() => {
        if (status === 'idle') startSession();
      }}
    >

      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-neutral-950 to-neutral-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full px-6">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tighter bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            Researcher Pro
          </h1>
          <p className="text-neutral-400 text-lg font-light">
            {status === 'idle' ? 'Tap anywhere to start' : 'Voice-First PubMed Intelligence'}
          </p>
        </header>

        <main className="w-full flex justify-center py-12">
          <StatusIndicator status={status} />
        </main>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Future: Citation Cards will go here */}
      </div>
    </div>
  );
}

export default App;

