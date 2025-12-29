
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import { ChatMessage } from '../models/conversation.model';

const TypingIndicator = () => (
  <div className="flex items-center space-x-1.5">
    <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
    <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
    <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
  </div>
);

// FIX: Explicitly type ChatBubble as a React.FC to ensure special props like 'key' are handled correctly by TypeScript's JSX parser.
const ChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end space-x-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 flex-shrink-0">
          <i className="fas fa-robot"></i>
        </div>
      )}
      <div className={`p-3 rounded-2xl max-w-sm md:max-w-md ${isUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 rounded-bl-none'}`}>
        {msg.text ? <p className="text-sm md:text-base leading-relaxed">{msg.text}</p> : <TypingIndicator />}
      </div>
    </div>
  );
};

export function Chat() {
  const { conversationState, activeConversation, startConversation, addUserMessage, stopConversation } = useAppContext();
  const { isListening, isSpeaking, listen, speak, stop } = useSpeech();
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeConversation]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const handleStart = async () => {
    startConversation();
    setTimeout(async () => {
      try {
        await speak('Hallo! Ich bin Herr Schmidt. Lass uns auf Deutsch sprechen. Wie geht es Ihnen heute?', 'de-DE');
      } catch (e) { console.error(e); }
    }, 100);
  };

  const handleMicClick = async () => {
    if (isListening || isSpeaking || isProcessing) {
      stop();
      return;
    }
    try {
      const transcript = await listen('de-DE');
      if (transcript) {
        setIsProcessing(true);
        const response = await addUserMessage(transcript);
        setIsProcessing(false);
        if (response) {
          await speak(response, 'de-DE');
        }
      }
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const isMicDisabled = isListening || isSpeaking || isProcessing;
  const micButtonClass = useMemo(() => {
      if (isListening) return 'bg-red-500 mic-listening';
      if (isSpeaking) return 'bg-sky-500 mic-speaking';
      return 'bg-blue-500 hover:bg-blue-600';
  }, [isListening, isSpeaking]);

  const micButtonIcon = useMemo(() => {
    if (isListening) return 'fa-microphone-slash';
    if (isSpeaking || isProcessing) return 'fa-circle-stop';
    return 'fa-microphone';
  }, [isListening, isSpeaking, isProcessing]);

  const micButtonHint = useMemo(() => {
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'Herr Schmidt is speaking...';
    if (isProcessing) return 'Thinking...';
    if (conversationState === 'active') return 'Tap the microphone to speak';
    return '';
  }, [isListening, isSpeaking, isProcessing, conversationState]);

  const renderContent = () => {
    switch (conversationState) {
      case 'idle':
      case 'report_ready':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ready to Practice?</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Start a new conversation to test your German speaking skills.</p>
            <button onClick={handleStart} className="px-8 py-3 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition-transform transform hover:scale-105 duration-300 shadow-lg">
              Start New Conversation
            </button>
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Analyzing your conversation...</h2>
            <p className="text-slate-500 dark:text-slate-400">Please wait while I prepare your feedback.</p>
          </div>
        );
      case 'active':
        return (
          <>
            <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
              {activeConversation.map((msg, index) => <ChatBubble key={index} msg={msg} />)}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex flex-col items-center space-y-2">
                <button onClick={handleMicClick} disabled={isMicDisabled} className={`w-16 h-16 rounded-full text-white flex items-center justify-center text-2xl transition-all duration-300 shadow-lg ${micButtonClass}`}>
                  <i className={`fas ${micButtonIcon}`}></i>
                </button>
                <p className="text-sm text-slate-500 dark:text-slate-400 h-5">{micButtonHint}</p>
                <button onClick={() => stopConversation()} className="text-sm text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  End Conversation & Get Report
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-4xl mx-auto bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-100/50 dark:shadow-slate-950/50 overflow-hidden border border-slate-200 dark:border-slate-700">
      {renderContent()}
    </div>
  );
}
