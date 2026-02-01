import React from 'react';
import { Mic, MicOff, Trash2 } from 'lucide-react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Visualizer } from './components/Visualizer';
import { Transcript } from './components/Transcript';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    clearTranscripts,
    connectionState, 
    transcripts, 
    inputAnalyser, 
    outputAnalyser 
  } = useGeminiLive();

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const isError = connectionState === ConnectionState.ERROR;

  const handleToggleConnection = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    // Main Container: Full viewport height, dark background.
    // Flexbox centers the content on large screens, but allows full width on mobile.
    <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center sm:p-4 md:p-8">
      
      {/* 
         Card Container: 
         - Mobile: w-full h-full (fills screen), no rounded corners, no border.
         - Tablet/Desktop: max-w-lg h-[90vh], rounded, border.
      */}
      <div className="
        w-full h-[100dvh] sm:h-[85vh] sm:max-w-md md:max-w-lg lg:max-w-xl 
        bg-neutral-900 
        sm:rounded-[2.5rem] 
        shadow-2xl 
        border-0 sm:border border-neutral-800 
        flex flex-col overflow-hidden relative
      ">
        
        {/* Header */}
        <div className="h-16 sm:h-20 flex-shrink-0 flex items-center justify-between px-6 sm:px-8 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-10">
          <div className="flex flex-col">
            <h1 className="font-semibold text-neutral-100 text-lg tracking-tight">Gemini Live</h1>
            <div className="flex items-center gap-2">
               <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`}></span>
               <span className="text-xs font-medium text-neutral-400">
                  {isConnected ? 'Live' : 'Offline'}
               </span>
            </div>
          </div>
          <button
            onClick={clearTranscripts}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-all"
            title="Clear transcript"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Visualizer Area */}
        {/* This acts as the "Face" of the AI. Prominent at the top. */}
        <div className="h-48 sm:h-56 flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-900/50">
           <div className="absolute inset-0 w-full h-full">
              {/* Output (Bot) Visualizer - Fluid Circle */}
              <Visualizer 
                analyser={outputAnalyser} 
                isActive={isConnected} 
                barColor="#818cf8" // Indigo-400
              />
           </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 bg-neutral-900 relative flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-neutral-900 to-transparent z-10 pointer-events-none"/>
            <Transcript items={transcripts} />
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-neutral-900 to-transparent z-10 pointer-events-none"/>
        </div>

        {/* Bottom Controls */}
        <div className="h-24 sm:h-28 flex-shrink-0 bg-neutral-900 border-t border-neutral-800 flex flex-col items-center justify-center relative z-20 gap-2">
          
          {isError && (
             <div className="text-rose-500 text-xs font-medium bg-rose-500/10 px-3 py-1 rounded-full animate-pulse border border-rose-500/20">
                Connection Failed. Check API Key.
             </div>
          )}

          <button
            onClick={handleToggleConnection}
            className={`
              relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full transition-all duration-300 shadow-xl
              ${isConnected 
                ? 'bg-neutral-100 text-rose-600 hover:bg-white hover:scale-105' 
                : isError 
                  ? 'bg-rose-900/20 text-rose-500 border border-rose-800'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105'}
              ${isConnecting ? 'opacity-80 animate-pulse' : ''}
            `}
          >
            {isConnected ? (
              <MicOff size={28} strokeWidth={2.5} />
            ) : (
              <Mic size={28} strokeWidth={2.5} />
            )}
            
            {/* Ping animation when connected */}
            {isConnected && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-neutral-100 opacity-20 animate-ping"></span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default App;