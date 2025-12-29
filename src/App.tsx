
import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { Progress } from './components/Progress';
import { Writing } from './components/Writing';

type View = 'chat' | 'writing' | 'progress';

export function App() {
  const [currentView, setCurrentView] = useState<View>('chat');

  const navButtonClass = (view: View) => {
    const isActive = currentView === view;
    return `px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ease-in-out text-sm ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700'
    }`;
  };

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <Chat />;
      case 'writing':
        return <Writing />;
      case 'progress':
        return <Progress />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 antialiased">
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-800/60 p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <i className="fas fa-comment-dots text-xl text-white"></i>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">German Coach</h1>
          </div>
          <nav className="flex items-center space-x-1 md:space-x-2">
            <button onClick={() => setCurrentView('chat')} className={navButtonClass('chat')}>
              <i className="fas fa-microphone-alt mr-2"></i>
              Chat
            </button>
            <button onClick={() => setCurrentView('writing')} className={navButtonClass('writing')}>
              <i className="fas fa-pen-nib mr-2"></i>
              Writing
            </button>
            <button onClick={() => setCurrentView('progress')} className={navButtonClass('progress')}>
              <i className="fas fa-chart-line mr-2"></i>
              Progress
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {renderView()}
      </main>

      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Powered by React & Google Gemini</p>
      </footer>
    </div>
  );
}
