import React from 'react';
import { Sidebar } from './components/Sidebar';
import { MainArea } from './components/MainArea';
import { useState } from 'react';

export default function App() {
    const [results, setResults] = useState(null);
  return (
    <>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #27272a;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #3f3f46;
          }
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}
      </style>
      <div className="flex h-screen w-full overflow-hidden bg-black selection:bg-cyan-500/30 selection:text-cyan-200 text-slate-200 font-sans antialiased">
        <Sidebar onResultsReady={setResults} />
        <MainArea results={results} />
      </div>
    </>
  );
}
